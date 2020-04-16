/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove this once CCR is migrated to the plugins directory.
export function indexManagement(kibana: any) {
  return new kibana.Plugin({
    id: 'index_management',
    configPrefix: 'xpack.index_management',
  });
}
