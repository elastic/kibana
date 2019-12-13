/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mappings from './mappings.json';

export function advancedData(kibana: any) {
  return new kibana.Plugin({
    id: 'advancedData',
    configPrefix: 'xpack.advancedData',
    uiExports: {
      mappings,
    },
  });
}
