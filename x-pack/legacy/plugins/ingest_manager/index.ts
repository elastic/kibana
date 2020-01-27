/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { savedObjectMappings } from '../../../plugins/ingest_manager/server';

// TODO https://github.com/elastic/kibana/issues/46373
// const INDEX_NAMES = {
//   INGEST: '.kibana',
// };

export function ingestManager(kibana: any) {
  return new kibana.Plugin({
    id: 'ingestManager',
    uiExports: {
      savedObjectSchemas: {
        agent_configs: {
          isNamespaceAgnostic: true,
          // indexPattern: INDEX_NAMES.INGEST,
        },
      },
      mappings: savedObjectMappings,
    },
  });
}
