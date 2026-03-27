/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamlangResolverOptions } from '@kbn/streamlang/types/resolvers';
import { createEnrichPolicyResolver } from './enrich_policy_resolver';

export const createStreamlangResolverOptions = (
  esClient: ElasticsearchClient
): StreamlangResolverOptions => ({
  enrich: createEnrichPolicyResolver(esClient),
});
