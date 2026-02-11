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
import { schema } from '@kbn/config-schema';
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

    // Ensure system index exists (lazy, idempotent)
    ensureProfilesIndex({ esClient, logger: this.logger }).catch((err) => {
      this.logger.error(`Failed to ensure anonymization profiles index: ${err.message}`);
    });

    // Initialize services
    const saltService = new SaltService(core.savedObjects, deps.encryptedSavedObjects, this.logger);
    const profilesRepo = new ProfilesRepository(esClient);

    this.policyService = {
      resolveEffectivePolicy: async (namespace, target) => {
        // For data_view targets: load data view profile + any contributing index pattern profiles
        // For index_pattern / index targets: load that target's profile only
        const profile = await profilesRepo.findByTarget(namespace, target.type, target.id);

        if (!profile) {
          return {};
        }

        // TODO(future): For data_view targets, also load index pattern profiles
        // from the data view's patterns and merge them using resolveEffectivePolicy.
        // For now, resolve from the single profile found.
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
