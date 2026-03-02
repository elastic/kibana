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
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AnonymizationConfig } from './config';

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
import { createAnonymizationPolicyService } from './policy_service';

export interface AnonymizationSetupDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  features: FeaturesPluginSetup;
}

export interface AnonymizationStartDeps {
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
  private readonly config: AnonymizationConfig;
  private policyService: AnonymizationPolicyService | undefined;

  constructor(initializerContext: PluginInitializerContext<AnonymizationConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<AnonymizationConfig>();
  }

  public setup(core: CoreSetup<AnonymizationStartDeps>, deps: AnonymizationSetupDeps) {
    this.logger.debug('anonymization: Setup');

    // Register Kibana feature privileges
    registerFeatures({ features: deps.features });

    const router = core.http.createRouter();
    registerRoutes(router, this.logger, { active: this.config.active });

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

    return {
      isEnabled: () => this.config.active,
    };
  }

  public start(core: CoreStart, deps: AnonymizationStartDeps): AnonymizationPluginStart {
    this.logger.debug('anonymization: Started');
    const anonymizationEnabled = this.config.active;

    const esClient = core.elasticsearch.client.asInternalUser;

    const ensureProfilesIndexReady = async (): Promise<void> => {
      await ensureProfilesIndex({ esClient, logger: this.logger });
    };

    // Initialize services
    const saltService = new SaltService(core.savedObjects, deps.encryptedSavedObjects, this.logger);
    const profilesRepo = new ProfilesRepository(esClient);
    this.policyService = createAnonymizationPolicyService({
      anonymizationEnabled,
      core,
      logger: this.logger,
      ensureProfilesIndexReady,
      profilesRepo,
      saltService,
    });

    return {
      isEnabled: () => anonymizationEnabled,
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
