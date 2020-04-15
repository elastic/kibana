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
import { MlPluginSetup as MlSetup } from '../../../../plugins/ml/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../../../plugins/encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../../../plugins/spaces/server';
import { PluginStartContract as ActionsStart } from '../../../../plugins/actions/server';
import { LicensingPluginSetup } from '../../../../plugins/licensing/server';
import { LegacyServices } from './types';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { initRoutes } from './routes';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import { rulesNotificationAlertType } from './lib/detection_engine/notifications/rules_notification_alert_type';
import { isNotificationAlertExecutor } from './lib/detection_engine/notifications/types';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
  ruleStatusSavedObjectType,
  ruleActionsSavedObjectType,
} from './saved_objects';
import { SiemClientFactory } from './client';
import { hasListsFeature, listsEnvFeatureFlagName } from './lib/detection_engine/feature_flags';

export { CoreSetup, CoreStart };

export interface SetupPlugins {
  alerting: AlertingSetup;
  encryptedSavedObjects: EncryptedSavedObjectsSetup;
  features: FeaturesSetup;
  licensing: LicensingPluginSetup;
  security?: SecuritySetup;
  spaces?: SpacesSetup;
  ml?: MlSetup;
}

export interface StartPlugins {
  actions: ActionsStart;
  alerting: AlertingStart;
}

export class Plugin {
  readonly name = 'siem';
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private siemClientFactory: SiemClientFactory;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', this.name);
    this.siemClientFactory = new SiemClientFactory();

    this.logger.debug('Shim plugin initialized');
  }

  public setup(core: CoreSetup, plugins: SetupPlugins, __legacy: LegacyServices) {
    this.logger.debug('Shim plugin setup');
    if (hasListsFeature()) {
      // TODO: Remove this once we have the lists feature supported
      this.logger.error(
        `You have activated the lists feature flag which is NOT currently supported for SIEM! You should turn this feature flag off immediately by un-setting the environment variable: ${listsEnvFeatureFlagName} and restarting Kibana`
      );
    }

    const router = core.http.createRouter();
    core.http.registerRouteHandlerContext(this.name, (context, request, response) => ({
      getSiemClient: () => this.siemClientFactory.create(request),
    }));

    this.siemClientFactory.setup({
      getSpaceId: plugins.spaces?.spacesService?.getSpaceId,
      config: __legacy.config,
    });

    initRoutes(
      router,
      __legacy.config,
      plugins.encryptedSavedObjects?.usingEphemeralEncryptionKey ?? false,
      plugins.security
    );

    plugins.features.registerFeature({
      id: this.name,
      name: i18n.translate('xpack.siem.featureRegistry.linkSiemTitle', {
        defaultMessage: 'SIEM',
      }),
      order: 1100,
      icon: 'securityAnalyticsApp',
      navLinkId: 'siem',
      app: ['siem', 'kibana'],
      catalogue: ['siem'],
      privileges: {
        all: {
          app: ['siem', 'kibana'],
          catalogue: ['siem'],
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
              ruleActionsSavedObjectType,
              'cases',
              'cases-comments',
              'cases-configure',
              'cases-user-actions',
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
          app: ['siem', 'kibana'],
          catalogue: ['siem'],
          api: ['siem', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
          savedObject: {
            all: ['alert', 'action', 'action_task_params'],
            read: [
              'config',
              noteSavedObjectType,
              pinnedEventSavedObjectType,
              timelineSavedObjectType,
              ruleStatusSavedObjectType,
              ruleActionsSavedObjectType,
              'cases',
              'cases-comments',
              'cases-configure',
              'cases-user-actions',
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
      const signalRuleType = signalRulesAlertType({
        logger: this.logger,
        version: this.context.env.packageInfo.version,
        ml: plugins.ml,
      });
      const ruleNotificationType = rulesNotificationAlertType({
        logger: this.logger,
      });

      if (isAlertExecutor(signalRuleType)) {
        plugins.alerting.registerType(signalRuleType);
      }

      if (isNotificationAlertExecutor(ruleNotificationType)) {
        plugins.alerting.registerType(ruleNotificationType);
      }
    }

    const libs = compose(core, plugins, this.context.env.mode.prod);
    initServer(libs);
  }

  public start(core: CoreStart, plugins: StartPlugins) {}
}
