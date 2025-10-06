/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/server';
import {
  type CoreSetup,
  type CoreStart,
  type PluginInitializerContext,
  type Logger,
} from '@kbn/core/server';
import type { InterceptSetup, InterceptStart } from '@kbn/intercepts-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import {
  TRIGGER_DEF_ID,
  UPGRADE_TRIGGER_DEF_PREFIX_ID,
  TRIAL_TRIGGER_DEF_ID,
} from '../common/constants';
import type { ServerConfigSchema } from '../common/config';

interface ProductInterceptServerPluginSetup {
  cloud: CloudSetup;
  intercepts: InterceptSetup;
}

interface ProductInterceptServerPluginStart {
  intercepts: InterceptStart;
}

/**
 * @internal
 */
export class ProductInterceptServerPlugin
  implements Plugin<object, object, ProductInterceptServerPluginSetup, never>
{
  private readonly logger: Logger;
  private readonly config: ServerConfigSchema;
  private readonly buildVersion: string;
  private trialEndDate?: Date;

  constructor(initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<ServerConfigSchema>();
    this.buildVersion = initContext.env.packageInfo.version;
  }

  setup(core: CoreSetup, { cloud }: ProductInterceptServerPluginSetup) {
    this.trialEndDate = cloud?.trialEndDate;

    return {};
  }

  start(core: CoreStart, { intercepts }: ProductInterceptServerPluginStart) {
    if (this.config.enabled) {
      void intercepts.registerTriggerDefinition?.(TRIGGER_DEF_ID, () => {
        this.logger.debug('Registering global product intercept trigger definition');
        return { triggerAfter: this.config.interval };
      });

      void intercepts.registerTriggerDefinition?.(
        `${UPGRADE_TRIGGER_DEF_PREFIX_ID}:${this.buildVersion}`,
        () => {
          this.logger.debug('Registering global product upgrade intercept trigger definition');
          return { triggerAfter: this.config.upgradeInterceptInterval, isRecurrent: false };
        }
      );

      // Register trial intercept only if the trial end date is set and not passed
      if (Date.now() <= (this.trialEndDate?.getTime() ?? 0)) {
        void intercepts.registerTriggerDefinition?.(
          `${TRIAL_TRIGGER_DEF_ID}:${this.buildVersion}`,
          () => {
            this.logger.debug('Registering global product trial intercept trigger definition');
            return {
              triggerAfter: this.config.trialInterceptInterval,
              isRecurrent: false,
            };
          }
        );
      }
    }

    return {};
  }
}
