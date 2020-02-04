/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, PluginInitializerContext, Logger } from '../../../../../src/core/server';
import { SecurityPluginSetup as SecuritySetup } from '../../../../plugins/security/server';
import { PluginSetupContract as FeaturesSetup } from '../../../../plugins/features/server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { initRoutes } from './routes';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
  ruleStatusSavedObjectType,
} from './saved_objects';
import { ServerFacade } from './types';

export { CoreSetup, Logger, PluginInitializerContext };

export interface SetupPlugins {
  features: FeaturesSetup;
  security: SecuritySetup;
}

export type SetupServices = CoreSetup & SetupPlugins;
export type LegacySetupServices = SetupServices & ServerFacade;

export class Plugin {
  readonly name = 'siem';
  private readonly logger: Logger;
  private context: PluginInitializerContext;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', this.name);

    this.logger.debug('Shim plugin initialized');
  }

  public setup(core: CoreSetup, plugins: SetupPlugins, __legacy: ServerFacade) {
    this.logger.debug('Shim plugin setup');

    plugins.features.registerFeature({
      id: this.name,
      name: i18n.translate('xpack.siem.featureRegistry.linkSiemTitle', {
        defaultMessage: 'SIEM',
      }),
      icon: 'securityAnalyticsApp',
      navLinkId: 'siem',
      app: ['siem', 'kibana'],
      catalogue: ['siem'],
      privileges: {
        all: {
          api: ['siem', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
          savedObject: {
            all: [
              'alert',
              'action',
              'action_task_params',
              noteSavedObjectType,
              pinnedEventSavedObjectType,
              timelineSavedObjectType,
              ruleStatusSavedObjectType,
            ],
            read: ['config'],
          },
          ui: [
            'show',
            'crud',
            'alerting:show',
            'actions:show',
            'alerting:save',
            'actions:save',
            'alerting:delete',
            'actions:delete',
          ],
        },
        read: {
          api: ['siem', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
          savedObject: {
            all: ['alert', 'action', 'action_task_params'],
            read: [
              'config',
              noteSavedObjectType,
              pinnedEventSavedObjectType,
              timelineSavedObjectType,
              ruleStatusSavedObjectType,
            ],
          },
          ui: [
            'show',
            'alerting:show',
            'actions:show',
            'alerting:save',
            'actions:save',
            'alerting:delete',
            'actions:delete',
          ],
        },
      },
    });

    if (__legacy.plugins.alerting != null) {
      const type = signalRulesAlertType({
        logger: this.logger,
        version: this.context.env.packageInfo.version,
      });
      if (isAlertExecutor(type)) {
        __legacy.plugins.alerting.setup.registerType(type);
      }
    }

    const libs = compose(core, plugins, this.context.env);
    initServer(libs);
    initRoutes({ ...core, ...plugins, ...__legacy });
  }
}
