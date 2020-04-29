/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Root } from 'joi';
import mappings from './mappings.json';
import {
  LegacyPluginApi,
  LegacyPluginSpec,
  ArrayOrItem,
} from '../../../../../src/legacy/plugin_discovery/types';

export function alerting(kibana: LegacyPluginApi): ArrayOrItem<LegacyPluginSpec> {
  return new kibana.Plugin({
    id: 'alerting',
    configPrefix: 'xpack.alerting',
    require: ['kibana', 'elasticsearch', 'actions', 'task_manager', 'encryptedSavedObjects'],
    isEnabled(config: Legacy.KibanaConfig) {
      return (
        config.get('xpack.alerting.enabled') === true &&
        config.get('xpack.actions.enabled') === true &&
        config.get('xpack.encryptedSavedObjects.enabled') === true &&
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
    uiExports: {
      mappings,
    },
  } as Legacy.PluginSpecOptions);
}
