/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { REQUESTS_SAVED_OBJECT_ID, REQUESTS_SAVED_OBJECT_TYPE } from '../../common';

interface RequestsAttributes {
  count: number;
}

/**
 * Numbers the runs that starts ask for, in the order Elasticsearch saw them, so a run can tell
 * which requests it covers without comparing the clocks of different Kibana instances.
 */
export class RequestsClient {
  constructor(private readonly repository: ISavedObjectsRepository) {}

  /** Takes the next request number, starting at 1. */
  async next(): Promise<number> {
    const { attributes } = await this.repository.incrementCounter<RequestsAttributes>(
      REQUESTS_SAVED_OBJECT_TYPE,
      REQUESTS_SAVED_OBJECT_ID,
      ['count']
    );
    return attributes.count;
  }

  /** The highest request number taken so far, or 0 before the first. */
  async latest(): Promise<number> {
    try {
      const { attributes } = await this.repository.get<RequestsAttributes>(
        REQUESTS_SAVED_OBJECT_TYPE,
        REQUESTS_SAVED_OBJECT_ID
      );
      return attributes.count;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return 0;
      }
      throw error;
    }
  }
}
