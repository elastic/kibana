/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { SemanticTextMapping } from './semantic_text';
import { getSemanticTextMapping } from './semantic_text';

/**
 * Returns the Elasticsearch mappings for Security Labs content.
 * The `semantic_text` fields use the provided mapping (defaults to ELSER) so the
 * artifact can be built against ELSER, E5, or Jina depending on the inference id.
 */
export const getSecurityLabsMappings = (
  semanticTextMapping: SemanticTextMapping = getSemanticTextMapping()
): MappingTypeMapping => {
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
