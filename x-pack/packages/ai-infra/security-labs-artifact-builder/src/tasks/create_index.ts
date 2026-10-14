/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getSecurityLabsMappings } from '../artifact/mappings';
import type { SemanticTextMapping } from '../artifact/semantic_text';
import { getSemanticTextMapping } from '../artifact/semantic_text';

export {
  DEFAULT_ELSER,
  DEFAULT_E5_SMALL,
  DEFAULT_JINA,
  getSemanticTextMapping,
} from '../artifact/semantic_text';
export type { SemanticTextMapping } from '../artifact/semantic_text';

/**
 * Creates the target Elasticsearch index with a semantic_text mapping driven by
 * the supplied inference id (defaults to ELSER).
 */
export const createTargetIndex = async ({
  indexName,
  client,
  semanticTextMapping,
}: {
  indexName: string;
  client: Client;
  semanticTextMapping?: SemanticTextMapping;
}) => {
  const mappings = getSecurityLabsMappings(semanticTextMapping ?? getSemanticTextMapping());

  await client.indices.create({
    index: indexName,
    mappings,
    settings: {
      'index.mapping.semantic_text.use_legacy_format': false,
    },
  });
};
