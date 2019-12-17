/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, PluginInitializerContext, Logger } from 'src/core/server';
import { PluginSetupContract as FeaturesSetupContract } from '../../../../plugins/features/server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from './saved_objects';

export interface PluginsSetup {
  features: FeaturesSetupContract;
}

export class Plugin {
  readonly name = 'siem';
  private readonly logger: Logger;
  private context: PluginInitializerContext;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', this.name);

    this.logger.debug('Shim plugin initialized');
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
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
            ],
            read: ['config'],
          },
          ui: ['show'],
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
            ],
          },
          ui: ['show'],
        },
      },
    });

    const libs = compose(core, this.context.env);
    initServer(libs);
  }
}
