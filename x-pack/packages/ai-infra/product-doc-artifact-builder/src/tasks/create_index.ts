/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const DEFAULT_ELSER = '.elser-2-elasticsearch';

const mappings: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    content_title: { type: 'text' },
    content_body: {
      type: 'semantic_text',
      inference_id: DEFAULT_ELSER,
    },
    product_name: { type: 'keyword' },
    root_type: { type: 'keyword' },
    slug: { type: 'keyword' },
    url: { type: 'keyword' },
    version: { type: 'version' },
    ai_subtitle: { type: 'text' },
    ai_summary: {
      type: 'semantic_text',
      inference_id: DEFAULT_ELSER,
    },
    ai_questions_answered: {
      type: 'semantic_text',
      inference_id: DEFAULT_ELSER,
    },
    ai_tags: { type: 'keyword' },
  },
};

export const createTargetIndex = async ({
  indexName,
  client,
}: {
  indexName: string;
  client: Client;
}) => {
  await client.indices.create({
    index: indexName,
    mappings,
    settings: {
      'index.mapping.semantic_text.use_legacy_format': false,
    },
  });
};
