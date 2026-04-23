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
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { ANONYMIZATION_FEATURE_ACTIVE } from '@kbn/anonymization-common';

import type {
  AnonymizationPluginSetup,
  AnonymizationPluginStart,
  AnonymizationPolicyService,
  AnonymizationProfileInitializer,
} from './types';
import { registerAnonymizationSaltSavedObjectType } from './saved_objects/register_anonymization_salt_saved_object_type';
import { registerRoutes } from './routes';
import { ensureProfilesIndex } from './system_index';
import { SaltService } from './salt';
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
  private readonly profileInitializers = new Map<string, AnonymizationProfileInitializer>();

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<AnonymizationStartDeps>, deps: AnonymizationSetupDeps) {
    this.logger.debug('anonymization: Setup');

    // Register Kibana feature privileges
    registerFeatures({ features: deps.features });

    const router = core.http.createRouter();
    registerRoutes(router, this.logger, { active: ANONYMIZATION_FEATURE_ACTIVE });

    registerAnonymizationSaltSavedObjectType(core, deps.encryptedSavedObjects);

    const registerProfileInitializer = (initializer: AnonymizationProfileInitializer): void => {
      if (this.profileInitializers.has(initializer.id)) {
        this.logger.warn(
          `Overwriting existing anonymization profile initializer: ${initializer.id}`
        );
      }
      this.profileInitializers.set(initializer.id, initializer);
    };

    return {
      isEnabled: () => ANONYMIZATION_FEATURE_ACTIVE,
      registerProfileInitializer,
    };
  }

  public start(core: CoreStart, deps: AnonymizationStartDeps): AnonymizationPluginStart {
    this.logger.debug('anonymization: Started');
    const anonymizationEnabled = ANONYMIZATION_FEATURE_ACTIVE;

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
      getProfileInitializers: () => Array.from(this.profileInitializers.values()),
    });

    const registerProfileInitializer = (initializer: AnonymizationProfileInitializer): void => {
      if (this.profileInitializers.has(initializer.id)) {
        this.logger.warn(
          `Overwriting existing anonymization profile initializer: ${initializer.id}`
        );
      }
      this.profileInitializers.set(initializer.id, initializer);
    };

    return {
      isEnabled: () => anonymizationEnabled,
      registerProfileInitializer,
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
