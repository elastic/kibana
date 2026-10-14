/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

// The serverless project types `tags.deploymentAgnostic` covers, without the stateful targets. For
// behaviour that only exists on serverless.
export const SERVERLESS_ONLY: string[] = [
  ...tags.serverless.search,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
];

// `tags.deploymentAgnostic` minus the Search serverless project, which has its own
// `search_indices` app for managing individual indices.
export const NOT_SVL_SEARCH: string[] = [
  ...tags.stateful.classic,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
];
