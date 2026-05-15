/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import { MEMORIES_DATA_STREAM } from '../../../common/constants';

export const memoriesMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    page_name: mappings.keyword(),
    title: mappings.text(),
    content: mappings.text(),
    categories: mappings.keyword(),
    tags: mappings.keyword(),
    references: mappings.keyword(),
    written_by: mappings.keyword(),
    workflow_execution_id: mappings.keyword(),
    is_deleted: mappings.boolean(),
  },
} satisfies MappingsDefinition;

export type StoredMemoryPage = GetFieldsOf<typeof memoriesMappings>;

export const memoriesDataStream: DataStreamDefinition<typeof memoriesMappings, StoredMemoryPage> = {
  name: MEMORIES_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: memoriesMappings,
  },
};
