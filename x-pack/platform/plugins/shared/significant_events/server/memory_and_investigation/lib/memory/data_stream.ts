/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */

import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

/**
 * Standard Elasticsearch Index mappings for Semantic Memory.
 * Aligns with Context Engine's base Knowledge Indicator (KI) schema,
 * and houses metadata/decaying counters inside a flattened attributes field.
 */
export const memoriesMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    // Core identity (matches KI fields)
    id: mappings.keyword(),
    type: mappings.keyword(), // Always 'memory'
    title: mappings.text({ fields: { keyword: { type: 'keyword', ignore_above: 512 } } }),
    description: mappings.text(),
    content: mappings.text(),
    // Semantic embedding field powered by Jina v3 (or fallback)
    search_embedding: mappings.semanticText(),
    // Keyword array (natively maps tags/keywords)
    tags: mappings.keyword(),
    // Flattened attribute bucket to hold categories, references, created_at, and decaying counters
    attributes: mappings.flattened(),
  },
} satisfies MappingsDefinition;

export type StoredMemoryPage = GetFieldsOf<typeof memoriesMappings>;
