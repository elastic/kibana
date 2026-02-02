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

const CCS_TOKEN = ':';

export const validateConfig = async ({
  config,
  esClient,
}: {
  config: IndexSearchToolConfig;
  esClient: ElasticsearchClient;
}) => {
  const { pattern } = config;
  if (pattern.includes(CCS_TOKEN)) {
    throw createBadRequestError(`Cross-cluster search is not supported by the index_search tool`);
  }

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
