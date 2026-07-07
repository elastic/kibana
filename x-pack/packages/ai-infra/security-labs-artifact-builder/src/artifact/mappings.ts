/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const DEFAULT_ELSER = '.elser-2-elasticsearch';

/**
 * Returns the Elasticsearch mappings for Security Labs content.
 * Uses ELSER for semantic_text fields to enable semantic search.
 */
export const getSecurityLabsMappings = (): MappingTypeMapping => {
  const semanticTextMapping = {
    type: 'semantic_text' as const,
    inference_id: DEFAULT_ELSER,
  };

  return {
    dynamic: 'strict',
    properties: {
      // Article title
      title: { type: 'text' },
      // URL slug
      slug: { type: 'keyword' },
      // Publication date
      date: { type: 'date' },
      // Article description - semantic search enabled
      description: semanticTextMapping,
      // Authors (comma-separated string)
      authors: { type: 'text' },
      // Categories as keywords
      categories: { type: 'keyword' },
      // Full article content - semantic search enabled
      content: semanticTextMapping,
      // Resource type identifier
      resource_type: { type: 'keyword' },
    },
  };
};
