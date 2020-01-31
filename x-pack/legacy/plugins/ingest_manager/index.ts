/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  savedObjectMappings,
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
} from '../../../plugins/ingest_manager/server';

// TODO https://github.com/elastic/kibana/issues/46373
// const INDEX_NAMES = {
//   INGEST: '.kibana',
// };

export function ingestManager(kibana: any) {
  return new kibana.Plugin({
    id: 'ingestManager',
    uiExports: {
      savedObjectSchemas: {
        [AGENT_CONFIG_SAVED_OBJECT_TYPE]: {
          isNamespaceAgnostic: true,
          // indexPattern: INDEX_NAMES.INGEST,
        },
        [OUTPUT_SAVED_OBJECT_TYPE]: {
          isNamespaceAgnostic: true,
          // indexPattern: INDEX_NAMES.INGEST,
        },
        [DATASOURCE_SAVED_OBJECT_TYPE]: {
          isNamespaceAgnostic: true,
          // indexPattern: INDEX_NAMES.INGEST,
        },
      },
      mappings: savedObjectMappings,
    },
  });
}
