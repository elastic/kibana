/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

// All serverless except vectordb/workplaceai, which preset the `logs-*` index mode and so reject the
// logsdb suites' data stream (duplicate `index.mode` from LogsdbIndexModeSettingsProvider).
export const SERVERLESS_LOGS_CAPABLE: string[] = [
  ...tags.serverless.search,
  ...tags.serverless.observability.all,
  ...tags.serverless.security.all,
];
