/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RepositoryStrategy } from './types';
import { createUrlRepository } from './url_repository';

interface ResolveRepositoryParams {
  repository?: RepositoryStrategy;
  snapshotUrl?: string;
}

export function resolveRepository({
  repository,
  snapshotUrl,
}: ResolveRepositoryParams): RepositoryStrategy {
  if (repository && snapshotUrl) {
    throw new Error('Cannot provide both repository and snapshotUrl');
  }

  if (repository) {
    return repository;
  }

  if (snapshotUrl) {
    return createUrlRepository(snapshotUrl);
  }

  throw new Error('Either repository or snapshotUrl must be provided');
}

export * from './types';
export * from './gcs_repository';
export * from './url_repository';
