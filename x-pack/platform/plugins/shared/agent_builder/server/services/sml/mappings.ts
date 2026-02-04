/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const keyword = { type: 'keyword' as const };
const date = { type: 'date' as const };
const text = { type: 'text' as const };

export const getSmlIndexMappings = (inferenceId: string): MappingTypeMapping => ({
  dynamic: false,
  properties: {
    id: keyword,
    type: keyword,
    title: keyword,
    fields: keyword,
    index_patterns: keyword,
    tags: keyword,
    attachment_id: keyword,
    attachment_type: keyword,
    content: text,
    content_embedding: {
      type: 'semantic_text',
      inference_id: inferenceId,
    },
    created_at: date,
    updated_at: date,
    spaces: keyword,
  },
});

export const smlCrawlerStateMappings: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: keyword,
    attachment_id: keyword,
    attachment_type: keyword,
    space_id: keyword,
    created_at: date,
    updated_at: date,
    update_action: keyword,
  },
};
