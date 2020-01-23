/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectMappings } from '../../../plugins/infra/server';

export const APP_ID = 'infra';

export function infra(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.infra',
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      mappings: savedObjectMappings,
    },
  });
}
