/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Root } from 'joi';
import mappings from './mappings.json';
import { init } from './server';

export { ActionsPlugin, ActionsClient, ActionType, ActionTypeExecutorOptions } from './server';

export function actions(kibana: any) {
  return new kibana.Plugin({
    id: 'actions',
    configPrefix: 'xpack.actions',
    require: ['kibana', 'elasticsearch', 'task_manager', 'encrypted_saved_objects'],
    isEnabled(config: Legacy.KibanaConfig) {
      return (
        config.get('xpack.encrypted_saved_objects.enabled') === true &&
        config.get('xpack.actions.enabled') === true &&
        config.get('xpack.task_manager.enabled') === true
      );
    },
    config(Joi: Root) {
      return Joi.object()
        .keys({
          enabled: Joi.boolean().default(true),
        })
        .default();
    },
    init,
    uiExports: {
      mappings,
    },
  });
}
