/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { ReviewClient, type ReviewsStorageAdapter } from './review_client';
import { reviewsStorageSettings, type ReviewItemStorageProperties } from './reviews_storage';

export class ReviewService {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly isServerless: boolean
  ) {}

  /** A client scoped to `spaceId`, required so every call site states the space it acts in. */
  getClient({ spaceId }: { spaceId: string }): ReviewClient {
    return new ReviewClient({
      storageAdapter: this.createStorageAdapter(),
      logger: this.logger,
      spaceId,
    });
  }

  private createStorageAdapter(): ReviewsStorageAdapter {
    return new StorageIndexAdapter<typeof reviewsStorageSettings, ReviewItemStorageProperties>(
      this.esClient,
      this.logger,
      reviewsStorageSettings,
      { isServerless: this.isServerless }
    );
  }
}
