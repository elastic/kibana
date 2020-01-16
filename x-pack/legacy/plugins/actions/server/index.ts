/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { init } from './init';
import mappings from './mappings.json';

export function actions(kibana: any) {
  return new kibana.Plugin({
    id: 'actions',
    configPrefix: 'xpack.actions',
    require: ['kibana', 'elasticsearch'],
    isEnabled(config: Legacy.KibanaConfig) {
      return (
        config.get('xpack.encryptedSavedObjects.enabled') === true &&
        config.get('xpack.actions.enabled') === true &&
        config.get('xpack.task_manager.enabled') === true
      );
    },
    init,
    uiExports: {
      mappings,
    },
  });
}
