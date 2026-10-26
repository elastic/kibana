/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import {
  DEFAULT_ELSER,
  getSemanticTextMapping,
  type SemanticTextMapping,
} from '../tasks/create_index';

export const getArtifactMappings = (
  customSemanticTextMapping?: SemanticTextMapping
): MappingTypeMapping => {
  const semanticTextMapping = customSemanticTextMapping
    ? customSemanticTextMapping
    : getSemanticTextMapping(DEFAULT_ELSER);
  return {
    dynamic: 'strict',
    properties: {
      content_title: { type: 'text' },
      content_body: semanticTextMapping,
      product_name: { type: 'keyword' },
      root_type: { type: 'keyword' },
      slug: { type: 'keyword' },
      url: { type: 'keyword' },
      version: { type: 'version' },
      ai_subtitle: { type: 'text' },
      ai_summary: semanticTextMapping,
      ai_questions_answered: semanticTextMapping,
      ai_tags: { type: 'keyword' },
    },
  };
};
