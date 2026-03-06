/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers, type CoreStart } from '@kbn/core/server';
import { resolveEffectivePolicy, type FieldRule } from '@kbn/anonymization-common';
import type { Logger } from '@kbn/logging';
import type { ProfilesRepository } from './repository';
import type { SaltService } from './salt';
import type { AnonymizationPolicyService, AnonymizationProfileInitializer } from './types';
import {
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
  LEGACY_ANONYMIZATION_UI_SETTING_KEY,
  ensureGlobalProfileForNamespace,
} from './initialization';

interface CreateAnonymizationPolicyServiceParams {
  anonymizationEnabled: boolean;
  core: CoreStart;
  logger: Logger;
  ensureProfilesIndexReady: () => Promise<void>;
  profilesRepo: ProfilesRepository;
  saltService: SaltService;
  getProfileInitializers: () => AnonymizationProfileInitializer[];
}

export const createAnonymizationPolicyService = ({
  anonymizationEnabled,
  core,
  logger,
  ensureProfilesIndexReady,
  profilesRepo,
  saltService,
  getProfileInitializers,
}: CreateAnonymizationPolicyServiceParams): AnonymizationPolicyService => {
  const getDataViewIndexPatternTargets = async (
    namespace: string,
    dataViewId: string
  ): Promise<string[]> => {
    const namespaceScopedClient = core.savedObjects
      .getUnsafeInternalClient()
      .asScopedToNamespace(namespace);

    try {
      const result = await namespaceScopedClient.resolve<{
        title?: string;
      }>('index-pattern', dataViewId);
      const title = result.saved_object?.attributes?.title;
      if (!title || typeof title !== 'string') {
        return [];
      }

      return title
        .split(',')
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern.length > 0);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return [];
      }
      logger.warn(
        `Failed resolving data view ${dataViewId} in space ${namespace}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return [];
    }
  };

  const dataViewExists = async (namespace: string, dataViewId: string): Promise<boolean> => {
    const client = core.savedObjects.getUnsafeInternalClient().asScopedToNamespace(namespace);
    try {
      await client.get('index-pattern', dataViewId);
      return true;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return false;
      }
      throw err;
    }
  };

  const getLegacySettingsForNamespace = async (namespace: string): Promise<string | undefined> => {
    const scopedInternalClient = core.savedObjects
      .getUnsafeInternalClient()
      .asScopedToNamespace(namespace);
    const uiSettingsClient = core.uiSettings.asScopedToClient(scopedInternalClient);
    return uiSettingsClient.get<string | undefined>(LEGACY_ANONYMIZATION_UI_SETTING_KEY);
  };

  return {
    resolveEffectivePolicy: async (namespace, target) => {
      if (!anonymizationEnabled) {
        return {};
      }

      await ensureProfilesIndexReady();
      await ensureGlobalProfileForNamespace({
        namespace,
        profilesRepo,
        logger,
        getLegacySettingsString: () => getLegacySettingsForNamespace(namespace),
      });

      for (const initializer of getProfileInitializers()) {
        if (!initializer.shouldInitialize({ namespace, target })) {
          continue;
        }

        await initializer.initialize({
          namespace,
          target,
          logger,
          findProfileByTarget: (targetType, targetId) =>
            profilesRepo.findByTarget(namespace, targetType, targetId),
          createProfile: (params) => profilesRepo.create(params),
          ensureSalt: () => saltService.getSalt(namespace),
          checkDataViewExists: (dataViewId) => dataViewExists(namespace, dataViewId),
        });
      }

      if (target.type === 'data_view') {
        const fieldRuleSets: FieldRule[][] = [];
        const dataViewProfile = await profilesRepo.findByTarget(namespace, target.type, target.id);
        if (dataViewProfile) {
          fieldRuleSets.push(dataViewProfile.rules.fieldRules);
        }

        const indexPatterns = await getDataViewIndexPatternTargets(namespace, target.id);
        if (indexPatterns.length > 0) {
          const indexPatternProfiles = await Promise.all(
            indexPatterns.map((indexPattern) =>
              profilesRepo.findByTarget(namespace, 'index_pattern', indexPattern)
            )
          );
          for (const profile of indexPatternProfiles) {
            if (profile) {
              fieldRuleSets.push(profile.rules.fieldRules);
            }
          }
        }

        if (fieldRuleSets.length === 0) {
          return {};
        }

        return resolveEffectivePolicy(...fieldRuleSets);
      }

      const profile = await profilesRepo.findByTarget(namespace, target.type, target.id);
      if (!profile) {
        return {};
      }
      return resolveEffectivePolicy(profile.rules.fieldRules);
    },

    getProfile: async (namespace, profileId) => {
      if (!anonymizationEnabled) {
        return null;
      }

      return profilesRepo.get(namespace, profileId);
    },

    getGlobalProfile: async (namespace) => {
      if (!anonymizationEnabled) {
        return null;
      }

      return profilesRepo.findByTarget(
        namespace,
        GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
        GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID
      );
    },

    ensureGlobalProfile: async (namespace) => {
      if (!anonymizationEnabled) {
        return;
      }

      await ensureProfilesIndexReady();
      await ensureGlobalProfileForNamespace({
        namespace,
        profilesRepo,
        logger,
        getLegacySettingsString: () => getLegacySettingsForNamespace(namespace),
      });
    },

    getSalt: async (namespace) => {
      return saltService.getSalt(namespace);
    },

    getReplacementsEncryptionKey: async (namespace) => {
      return saltService.getReplacementsEncryptionKey(namespace);
    },
  };
};
