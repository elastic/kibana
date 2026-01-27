/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getSecurityLabsMappings } from '../artifact/mappings';

export const DEFAULT_ELSER = '.elser-2-elasticsearch';

export interface SemanticTextMapping {
  type: 'semantic_text';
  inference_id: string;
}

/**
 * Creates the target Elasticsearch index with ELSER semantic_text mapping.
 */
export const createTargetIndex = async ({
  indexName,
  client,
}: {
  indexName: string;
  client: Client;
}) => {
  const mappings = getSecurityLabsMappings();

  await client.indices.create({
    index: indexName,
    mappings,
    settings: {
      'index.mapping.semantic_text.use_legacy_format': false,
    },
  });
};
