/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { FieldRule } from '@kbn/anonymization-common';
import { resolveEffectivePolicy } from '@kbn/anonymization-common';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

import type {
  AnonymizationPluginSetup,
  AnonymizationPluginStart,
  AnonymizationPolicyService,
} from './types';
import { registerRoutes } from './routes';
import { ensureProfilesIndex } from './system_index';
import { SaltService, ANONYMIZATION_SALT_SAVED_OBJECT_TYPE } from './salt';
import { ProfilesRepository } from './repository';
import { registerFeatures } from './features';
import {
  getAlertsDataViewTargetId,
  ALERTS_DATA_VIEW_TARGET_TYPE,
  ensureAlertsDataViewProfile,
} from './initialization';
import { migrateAnonymizationSettings } from './migration';

interface AnonymizationSetupDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  features: FeaturesPluginSetup;
}

interface AnonymizationStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

const anonymizationSaltSchemaV1 = schema.object({
  salt: schema.string(),
});

export class AnonymizationPlugin
  implements
    Plugin<
      AnonymizationPluginSetup,
      AnonymizationPluginStart,
      AnonymizationSetupDeps,
      AnonymizationStartDeps
    >
{
  private readonly logger: Logger;
  private policyService: AnonymizationPolicyService | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<AnonymizationStartDeps>, deps: AnonymizationSetupDeps) {
    this.logger.debug('anonymization: Setup');

    // Register Kibana feature privileges
    registerFeatures({ features: deps.features });

    const router = core.http.createRouter();
    registerRoutes(router, this.logger);

    // Register the encrypted saved object type for per-space salt material
    core.savedObjects.registerType({
      name: ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
      hidden: true,
      namespaceType: 'single',
      mappings: {
        dynamic: false,
        properties: {},
      },
      modelVersions: {
        1: {
          changes: [],
          schemas: {
            forwardCompatibility: anonymizationSaltSchemaV1.extends({}, { unknowns: 'ignore' }),
            create: anonymizationSaltSchemaV1,
          },
        },
      },
    });

    deps.encryptedSavedObjects.registerType({
      type: ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['salt']),
    });

    return {};
  }

  public start(core: CoreStart, deps: AnonymizationStartDeps): AnonymizationPluginStart {
    this.logger.debug('anonymization: Started');

    const esClient = core.elasticsearch.client.asInternalUser;

    const ensureProfilesIndexReady = async (): Promise<void> => {
      await ensureProfilesIndex({ esClient, logger: this.logger });
    };

    // Initialize services
    const saltService = new SaltService(core.savedObjects, deps.encryptedSavedObjects, this.logger);
    const profilesRepo = new ProfilesRepository(esClient);
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
        this.logger.warn(
          `Failed resolving data view ${dataViewId} in space ${namespace}: ${
            (err as Error).message
          }`
        );
        return [];
      }
    };
    const runLegacySettingsMigration = async (namespace: string): Promise<void> => {
      const namespaceScopedClient = core.savedObjects
        .getUnsafeInternalClient()
        .asScopedToNamespace(namespace);
      const namespaceUiSettingsClient =
        core.uiSettings.globalAsScopedToClient(namespaceScopedClient);

      await migrateAnonymizationSettings({
        namespace,
        esClient,
        uiSettings: namespaceUiSettingsClient,
        logger: this.logger,
      });
    };

    // Ensure a default alerts data view profile exists in the default space at startup.
    (async () => {
      try {
        await ensureProfilesIndexReady();
        await ensureAlertsDataViewProfile({
          namespace: 'default',
          profilesRepo,
          saltService,
          migrateLegacySettings: () => runLegacySettingsMigration('default'),
          logger: this.logger,
        });
      } catch (err) {
        this.logger.error(
          `Failed to initialize default alerts anonymization profile: ${(err as Error).message}`
        );
      }
    })();

    this.policyService = {
      resolveEffectivePolicy: async (namespace, target) => {
        if (
          target.type === ALERTS_DATA_VIEW_TARGET_TYPE &&
          target.id === getAlertsDataViewTargetId(namespace)
        ) {
          // Lazily ensure the alerts profile in the request namespace.
          await ensureProfilesIndexReady();
          await ensureAlertsDataViewProfile({
            namespace,
            profilesRepo,
            saltService,
            migrateLegacySettings: () => runLegacySettingsMigration(namespace),
            logger: this.logger,
          });
        }

        if (target.type === 'data_view') {
          const fieldRuleSets: FieldRule[][] = [];
          const dataViewProfile = await profilesRepo.findByTarget(
            namespace,
            target.type,
            target.id
          );
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
        return profilesRepo.get(namespace, profileId);
      },

      getSalt: async (namespace) => {
        return saltService.getSalt(namespace);
      },
    };

    return {
      getPolicyService: () => {
        if (!this.policyService) {
          throw new Error('AnonymizationPolicyService is not initialized');
        }
        return this.policyService;
      },
    };
  }

  public stop() {}
}
