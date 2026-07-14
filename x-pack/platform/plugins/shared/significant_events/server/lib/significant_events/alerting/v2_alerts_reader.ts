/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { toEsqlRequest } from '../../streams/esql';
import {
  RULES_BUCKET_SIZE,
  buildChangePointHistogramBounds,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';
import type {
  ChangePointRuleBucket,
  ChangePointTypeMap,
  ChangePointScanParams,
  CountDetectionAlertsParams,
  RuleMetadata,
} from './alerts_reader';
import {
  type ISignificantEventsAlertsReader,
  type OccurrencesEsqlParams,
  buildRuleMetadataMap,
} from './alerts_reader';

const EMPTY_CHANGE_POINT_TYPE: ChangePointTypeMap = {};

interface RawSignalCountAggregation {
  value?: number;
}

interface RawRuleBucket {
  key: string;
  doc_count: number;
  signal_count?: RawSignalCountAggregation;
  change_points?: { type?: ChangePointTypeMap };
}

export class SignificantEventsAlertsReaderV2 implements ISignificantEventsAlertsReader {
  readonly index = '.rule-events';
  readonly ruleIdColumn = 'rule_id' as const;

  buildOccurrencesEsqlRequest({ ruleIds, value, esqlUnit, limit, spaceId }: OccurrencesEsqlParams) {
    const ruleIdLiterals = ruleIds.map((id) => esql.str(id));
    const ruleIdCol = esql.col(['rule', 'id']);
    const typeCol = esql.col('type');
    const spaceIdCol = esql.col('space_id');

    return toEsqlRequest(
      esql.from([this.index]).where`${typeCol} == ${esql.str(
        'signal'
      )} AND ${spaceIdCol} == ${esql.str(spaceId)} AND ${ruleIdCol} IN (${ruleIdLiterals})`
        .pipe`STATS count = COUNT_DISTINCT(group_hash) BY rule_id = ${ruleIdCol}, bucket = BUCKET(@timestamp, ${esql.num(
        value
      )} ${esql.kwd(esqlUnit)})`.pipe`SORT bucket ASC`.pipe`LIMIT ${esql.num(limit)}`
    );
  }

  async countAlerts(
    esClient: TracedElasticsearchClient,
    { lookback, spaceId, ruleUuid }: CountDetectionAlertsParams
  ): Promise<number> {
    const filter: QueryDslQueryContainer[] = [
      { term: { type: 'signal' } },
      { term: { space_id: spaceId } },
      { range: { '@timestamp': { gte: lookback } } },
    ];
    if (ruleUuid) {
      filter.push({ term: { 'rule.id': ruleUuid } });
    }

    const response = await esClient.search('significant_events_alerts_v2_count_alerts', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: { bool: { filter } },
      aggs: {
        signal_count: {
          cardinality: { field: 'group_hash' },
        },
      },
    });

    return response.aggregations?.signal_count?.value ?? 0;
  }

  async runChangePointScan(
    esClient: TracedElasticsearchClient,
    params: ChangePointScanParams,
    queryLinks: QueryLink[]
  ) {
    const ruleMetadata = buildRuleMetadataMap(queryLinks);
    const response = await esClient.search('significant_events_alerts_v2_change_point_scan', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      // Drop the per-bucket `over_time` series from the response: it can be large and is only
      // needed server-side as the buckets_path input for the change_point pipeline agg, not in
      // the payload the Detection workflow consumes.
      filter_path: '-aggregations.by_rule.buckets.over_time',
      ...this.buildChangePointScanBody(params),
    });

    const rawBuckets =
      (response.aggregations?.by_rule as { buckets?: RawRuleBucket[] })?.buckets ?? [];

    return {
      took: response.took,
      by_rule: {
        buckets: rawBuckets.map((bucket) => this.enrichChangePointBucket(bucket, ruleMetadata)),
      },
    };
  }

  private buildChangePointScanBody({
    lookback,
    bucketInterval,
    spaceId,
    ruleIds,
  }: ChangePointScanParams) {
    const filter: Array<Record<string, unknown>> = [
      { term: { type: 'signal' } },
      { term: { space_id: spaceId } },
      { range: { '@timestamp': { gte: lookback } } },
    ];
    if (ruleIds?.length) {
      filter.push({ terms: { 'rule.id': ruleIds } });
    }

    return {
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        by_rule: {
          terms: { field: 'rule.id', size: RULES_BUCKET_SIZE },
          aggs: {
            signal_count: {
              cardinality: { field: 'group_hash' },
            },
            ...buildChangePointTimeSeriesAggs(bucketInterval, {
              extendedBounds: buildChangePointHistogramBounds(lookback, bucketInterval),
            }),
          },
        },
      },
    };
  }

  private enrichChangePointBucket(
    bucket: RawRuleBucket,
    ruleMetadata: Map<string, RuleMetadata>
  ): ChangePointRuleBucket {
    const meta = ruleMetadata.get(bucket.key);
    const ruleName = meta?.ruleName ?? 'unknown';
    const streamName = meta?.streamName ?? 'unknown';
    const changePoints = bucket.change_points?.type
      ? { type: bucket.change_points.type }
      : { type: EMPTY_CHANGE_POINT_TYPE };

    return {
      key: bucket.key,
      doc_count: bucket.signal_count?.value ?? bucket.doc_count,
      rule_name: { top: [{ metrics: { 'kibana.alert.rule.name': ruleName } }] },
      stream: { buckets: [{ key: streamName }] },
      change_points: changePoints,
    };
  }
}
