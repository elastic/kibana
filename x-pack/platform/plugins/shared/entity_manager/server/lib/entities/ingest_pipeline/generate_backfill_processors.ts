/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { generateLatestBackfillIndexName } from '../helpers/generate_component_id';

export function generateLatestBackfillProcessors(definition: EntityDefinition) {
  return [
    {
      set: {
        field: '_index',
        value: `${generateLatestBackfillIndexName(definition)}`,
      },
    },
    {
      set: {
        field: 'synthetic_ingest_ts',
        value: '{{_ingest.timestamp}}',
      },
    },
  ];
}
