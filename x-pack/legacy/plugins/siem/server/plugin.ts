/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  PluginStartContract as AlertingStart,
  PluginSetupContract as AlertingSetup,
} from '../../../../plugins/alerting/server';
import {
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Logger,
} from '../../../../../src/core/server';
import { SecurityPluginSetup as SecuritySetup } from '../../../../plugins/security/server';
import { PluginSetupContract as FeaturesSetup } from '../../../../plugins/features/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../../../plugins/encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../../../plugins/spaces/server';
import { PluginStartContract as ActionsStart } from '../../../../plugins/actions/server';
import { LegacyServices } from './types';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { initRoutes, LegacyInitRoutes } from './routes';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
  ruleStatusSavedObjectType,
} from './saved_objects';
import { ClientsService } from './services';

export { CoreSetup, CoreStart };

export interface SetupPlugins {
  encryptedSavedObjects: EncryptedSavedObjectsSetup;
  features: FeaturesSetup;
  security: SecuritySetup;
  spaces?: SpacesSetup;
  alerting: AlertingSetup;
}

export interface StartPlugins {
  actions: ActionsStart;
  alerting: AlertingStart;
}

export class Plugin {
  readonly name = 'siem';
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private clients: ClientsService;
  private legacyInitRoutes?: LegacyInitRoutes;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', this.name);
    this.clients = new ClientsService();

    this.logger.debug('Shim plugin initialized');
  }

  public setup(core: CoreSetup, plugins: SetupPlugins, __legacy: LegacyServices) {
    this.logger.debug('Shim plugin setup');

    this.clients.setup(core.elasticsearch.dataClient, plugins.spaces?.spacesService);

    this.legacyInitRoutes = initRoutes(
      __legacy.route,
      __legacy.config,
      plugins.encryptedSavedObjects?.usingEphemeralEncryptionKey ?? false
    );

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

    if (plugins.alerting != null) {
      const type = signalRulesAlertType({
        logger: this.logger,
        version: this.context.env.packageInfo.version,
      });
      if (isAlertExecutor(type)) {
        plugins.alerting.registerType(type);
      }
    }

    const libs = compose(core, plugins, this.context.env.mode.prod);
    initServer(libs);
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    this.clients.start(core.savedObjects, plugins.actions, plugins.alerting);

    this.legacyInitRoutes!(this.clients.createGetScoped());
  }
}
