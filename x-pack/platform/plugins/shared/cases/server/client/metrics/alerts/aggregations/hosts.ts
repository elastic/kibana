/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type { estypes } from '@elastic/elasticsearch';
import { MAX_ALERTS_PER_CASE } from '../../../../../common/constants';
import type { SingleCaseMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';

type HostsAggregate = HostsAggregateResponse | undefined;

interface HostsAggregateResponse {
  hosts_frequency?: {
    buckets: FieldAggregateBucket[];
  };
  hosts_total?: {
    value: number;
  };
}

interface FieldAggregateBucket {
  key: string;
  doc_count: number;
  top_fields: estypes.AggregationsTopHitsAggregate;
}

const hostName = 'host.name';
const hostId = 'host.id';
const DISPLAY_LIMIT = 10;

export class AlertHosts implements AggregationBuilder<SingleCaseMetricsResponse> {
  private termsSize: number;

  constructor(private readonly displayLimit: number = DISPLAY_LIMIT) {
    this.termsSize = displayLimit;
  }

  /**
   * Widens the terms aggregation from the display limit to MAX_ALERTS_PER_CASE so it
   * captures every unique host.id, not just the displayed top-N. Only call this when there
   * are entity attachments to dedupe against — it also multiplies the per-bucket top_hits
   * sub-aggregation cost, so callers should skip it otherwise.
   */
  widenToExhaustive(): void {
    this.termsSize = MAX_ALERTS_PER_CASE;
  }

  build(): Record<string, estypes.AggregationsAggregationContainer> {
    return {
      hosts_frequency: {
        terms: {
          field: hostId,
          size: this.termsSize,
        },
        aggs: {
          top_fields: {
            top_hits: {
              docvalue_fields: [hostName],
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              size: 1,
            },
          },
        },
      },
      hosts_total: {
        cardinality: {
          field: hostId,
        },
      },
    };
  }

  formatResponse(aggregations: AggregationResponse) {
    const aggs = aggregations as HostsAggregate;

    const allHosts = aggs?.hosts_frequency?.buckets.map((bucket) => ({
      name: AlertHosts.getHostName(bucket),
      id: bucket.key,
      count: bucket.doc_count,
    }));

    const totalHosts = aggs?.hosts_total?.value;

    const hostFields =
      allHosts && totalHosts
        ? { total: totalHosts, values: allHosts.slice(0, this.displayLimit) }
        : { total: 0, values: [] };

    return { alerts: { hosts: hostFields } };
  }

  /** Every unique host display name present in the case's alerts (not limited to the displayed top-N). */
  static getAllNames(aggregations: AggregationResponse): string[] {
    const aggs = aggregations as HostsAggregate;
    return aggs?.hosts_frequency?.buckets.map((bucket) => AlertHosts.getHostName(bucket)) ?? [];
  }

  private static getHostName(bucket: FieldAggregateBucket) {
    const unsafeHostName = get(bucket.top_fields.hits.hits[0].fields, hostName);

    if (Array.isArray(unsafeHostName) && unsafeHostName.length > 0) {
      return unsafeHostName[0];
    }
    return unsafeHostName;
  }

  getName() {
    return 'hosts';
  }
}
