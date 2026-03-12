/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndexSearchToolConfig } from '@kbn/agent-builder-common/tools';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';

/**
 * Validates the index_search tool config: ensures the pattern resolves to at least one
 * search source (index, alias, or data stream). Cross-cluster search (CCS) patterns
 * (e.g. cluster:index*) are allowed and passed through to listSearchSources.
 */
export const validateConfig = async ({
  config,
  esClient,
}: {
  config: IndexSearchToolConfig;
  esClient: ElasticsearchClient;
}) => {
  const {
    indices,
    aliases,
    data_streams: dataStreams,
  } = await listSearchSources({
    pattern: config.pattern,
    esClient,
  });

  if (indices.length === 0 && aliases.length === 0 && dataStreams.length === 0) {
    throw createBadRequestError(`No sources found for pattern '${config.pattern}'`);
  }
};
