/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexProgress, IndexRequest, IndexStats, RepositoryUri } from '../../model';

export type ProgressReporter = (progress: IndexProgress) => void;

export interface Indexer {
  start(ProgressReporter?: ProgressReporter, checkpointReq?: IndexRequest): Promise<IndexStats>;
  cancel(): void;
}

export interface IndexerFactory {
  create(
    repoUri: RepositoryUri,
    revision: string,
    enforcedReindex: boolean
  ): Promise<Indexer | undefined>;
}
