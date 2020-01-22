/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Root } from 'joi';
import mappings from './mappings.json';
import { init } from './server';
import { WhitelistedHosts, EnabledActionTypes } from './server/actions_config';

export {
  ActionsPlugin,
  ActionsClient,
  ActionType,
  ActionTypeExecutorOptions,
  PluginSetupContract,
  PluginStartContract,
} from './server';

export function actions(kibana: any) {
  return new kibana.Plugin({
    id: 'actions',
    configPrefix: 'xpack.actions',
    require: ['kibana', 'elasticsearch', 'task_manager', 'encryptedSavedObjects'],
    isEnabled(config: Legacy.KibanaConfig) {
      return (
        config.get('xpack.encryptedSavedObjects.enabled') === true &&
        config.get('xpack.actions.enabled') === true &&
        config.get('xpack.task_manager.enabled') === true
      );
    },
    config(Joi: Root) {
      return Joi.object()
        .keys({
          enabled: Joi.boolean().default(true),
          whitelistedHosts: Joi.array()
            .items(
              Joi.string()
                .hostname()
                .allow(WhitelistedHosts.Any)
            )
            .sparse(false)
            .default([WhitelistedHosts.Any]),
          enabledActionTypes: Joi.array()
            .items(Joi.string())
            .sparse(false)
            .default([EnabledActionTypes.Any]),
        })
        .default();
    },
    init,
    uiExports: {
      mappings,
    },
  });
}
