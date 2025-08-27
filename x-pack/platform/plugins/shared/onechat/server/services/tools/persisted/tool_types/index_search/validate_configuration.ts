/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndexSearchToolConfig } from '@kbn/onechat-common/tools';
import { createBadRequestError } from '@kbn/onechat-common';

export const validateConfig = async ({
  config,
  esClient,
}: {
  config: IndexSearchToolConfig;
  esClient: ElasticsearchClient;
}) => {
  // TODO

  throw createBadRequestError('validateConfig - testing');
};
