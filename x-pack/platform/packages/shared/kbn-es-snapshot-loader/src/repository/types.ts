/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

export type RepositoryType = 'url' | 'gcs';

export interface RepositoryStrategy {
  type: RepositoryType;
  validate(): void;
  register(params: { esClient: Client; log: ToolingLog; repoName: string }): Promise<void>;
}
