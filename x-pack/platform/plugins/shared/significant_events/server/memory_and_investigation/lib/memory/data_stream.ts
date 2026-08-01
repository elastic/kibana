/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import { MEMORIES_DATA_STREAM } from '../../../../common/memory_and_investigation';

export const memoriesMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    // Knowledge Item base fields
    type: mappings.keyword(),
    title: mappings.text({ fields: { keyword: { type: 'keyword', ignore_above: 512 } } }),
    content: mappings.text(),
    search_embedding: mappings.semanticText(),
    tags: mappings.keyword(),
    references: mappings.object({ properties: { uri: mappings.keyword() } }),
    origin: mappings.object({ properties: { uri: mappings.keyword() } }),
    created_at: mappings.date({ format: 'strict_date_optional_time' }),
    updated_at: mappings.date({ format: 'strict_date_optional_time' }),
    user_id: mappings.keyword(),
    // Nightshift memory extension fields
    id: mappings.keyword(),
    name: mappings.keyword(),
    categories: mappings.keyword(),
    version: mappings.long(),
    created_by: mappings.keyword(),
    updated_by: mappings.keyword(),
    is_deleted: mappings.boolean(),
  },
} satisfies MappingsDefinition;

export interface StoredMemoryPage {
  '@timestamp': string;
  type: 'memory';
  title: string;
  content: string;
  search_embedding?: string;
  tags: string[];
  references: Array<{ uri: string }>;
  origin: { uri: string };
  created_at: string;
  updated_at: string;
  user_id: string;
  id: string;
  name: string;
  categories: string[];
  version: number;
  created_by: string;
  updated_by: string;
  is_deleted: boolean;
}

type MappedMemoryPage = GetFieldsOf<typeof memoriesMappings>;
type StoredMemoryPageMappingCheck = StoredMemoryPage extends MappedMemoryPage
  ? Exclude<keyof StoredMemoryPage, keyof MappedMemoryPage> extends never
    ? Exclude<keyof MappedMemoryPage, keyof StoredMemoryPage> extends never
      ? true
      : never
    : never
  : never;

true satisfies StoredMemoryPageMappingCheck;

export const memoriesDataStream: DataStreamDefinition<typeof memoriesMappings, StoredMemoryPage> = {
  name: MEMORIES_DATA_STREAM,
  version: 1,
  hidden: false,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: memoriesMappings,
  },
};
