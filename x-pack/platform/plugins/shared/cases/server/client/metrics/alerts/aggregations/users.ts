/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ALERTS_PER_CASE } from '../../../../../common/constants';
import type { SingleCaseMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';

const DISPLAY_LIMIT = 10;

export class AlertUsers implements AggregationBuilder<SingleCaseMetricsResponse> {
  private termsSize: number;

  constructor(private readonly displayLimit: number = DISPLAY_LIMIT) {
    this.termsSize = displayLimit;
  }

  /**
   * Widens the terms aggregation from the display limit to MAX_ALERTS_PER_CASE so it
   * captures every unique user.name, not just the displayed top-N. Only call this when
   * there are entity attachments to dedupe against — it's otherwise wasted aggregation cost.
   */
  widenToExhaustive(): void {
    this.termsSize = MAX_ALERTS_PER_CASE;
  }

  build() {
    return {
      users_frequency: {
        terms: {
          field: userName,
          size: this.termsSize,
        },
      },
      users_total: {
        cardinality: {
          field: userName,
        },
      },
    };
  }

  formatResponse(aggregations: AggregationResponse) {
    const aggs = aggregations as UsersAggregate;

    const allUsers = aggs?.users_frequency?.buckets.map((bucket) => ({
      name: bucket.key,
      count: bucket.doc_count,
    }));

    const totalUsers = aggs?.users_total?.value;

    const usersFields =
      allUsers && totalUsers
        ? { total: totalUsers, values: allUsers.slice(0, this.displayLimit) }
        : { total: 0, values: [] };

    return { alerts: { users: usersFields } };
  }

  /** Every unique `user.name` value present in the case's alerts (not limited to the displayed top-N). */
  static getAllNames(aggregations: AggregationResponse): string[] {
    const aggs = aggregations as UsersAggregate;
    return aggs?.users_frequency?.buckets.map((bucket) => bucket.key) ?? [];
  }

  getName() {
    return 'users';
  }
}

const userName = 'user.name';

type UsersAggregate = UsersAggregateResponse | undefined;

interface UsersAggregateResponse {
  users_frequency?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  users_total?: {
    value: number;
  };
}
