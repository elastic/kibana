/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Root } from '@hapi/joi';
import { init } from './server';
import mappings from './mappings.json';

export { AlertingPlugin, AlertsClient, AlertType, AlertExecutorOptions } from './server';

export function alerting(kibana: any) {
  return new kibana.Plugin({
    id: 'alerting',
    configPrefix: 'xpack.alerting',
    require: ['kibana', 'elasticsearch', 'actions', 'task_manager', 'encrypted_saved_objects'],
    isEnabled(config: Legacy.KibanaConfig) {
      return (
        config.get('xpack.alerting.enabled') === true &&
        config.get('xpack.actions.enabled') === true &&
        config.get('xpack.encrypted_saved_objects.enabled') === true &&
        config.get('xpack.task_manager.enabled') === true
      );
    },
    config(Joi: Root) {
      return Joi.object()
        .keys({
          enabled: Joi.boolean().default(false),
        })
        .default();
    },
    init,
    uiExports: {
      mappings,
    },
  });
}
