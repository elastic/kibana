/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

export const memoryHistoryDataStreamName = '.significant_events-memory-history';

export const memoryHistoryMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    entry_id: mappings.keyword(),
    version: mappings.long(),
    name: mappings.keyword(),
    title: mappings.text(),
    content: mappings.text(),
    change_type: mappings.keyword(),
    change_summary: mappings.text(),
    created_at: mappings.date({ format: 'strict_date_optional_time' }),
    created_by: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export type StoredMemoryHistoryRecord = GetFieldsOf<typeof memoryHistoryMappings>;

export const memoryHistoryDataStream: DataStreamDefinition<
  typeof memoryHistoryMappings,
  StoredMemoryHistoryRecord
> = {
  name: memoryHistoryDataStreamName,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '180d' },
    mappings: memoryHistoryMappings,
  },
};
