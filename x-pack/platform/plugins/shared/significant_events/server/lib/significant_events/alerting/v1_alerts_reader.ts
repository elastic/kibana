/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { QueryLink } from '@kbn/significant-events-schema';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { termsQuery } from '@kbn/es-query';
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

interface RawRuleBucket {
  key: string;
  doc_count: number;
  rule_name?: { top?: Array<{ metrics?: Record<string, string> }> };
  stream?: { buckets?: Array<{ key: string }> };
  change_points?: { type?: ChangePointTypeMap };
}

export class SignificantEventsAlertsReaderV1 implements ISignificantEventsAlertsReader {
  readonly index = '.alerts-streams.alerts-default';
  readonly ruleIdColumn = 'rule_uuid' as const;

  buildOccurrencesEsqlRequest({ ruleIds, value, esqlUnit, limit }: OccurrencesEsqlParams) {
    const ruleIdLiterals = ruleIds.map((id) => esql.str(id));
    const ruleUuidCol = esql.col(ALERT_RULE_UUID.split('.'));

    return toEsqlRequest(
      esql.from([this.index]).where`${ruleUuidCol} IN (${ruleIdLiterals})`
        .pipe`STATS count = COUNT(*) BY rule_uuid = ${ruleUuidCol}, bucket = BUCKET(@timestamp, ${esql.num(
        value
      )} ${esql.kwd(esqlUnit)})`.pipe`SORT bucket ASC`.pipe`LIMIT ${esql.num(limit)}`
    );
  }

  async countAlerts(
    esClient: TracedElasticsearchClient,
    { lookback, spaceId, ruleUuid }: CountDetectionAlertsParams
  ): Promise<number> {
    const filter: QueryDslQueryContainer[] = [
      {
        terms: {
          'kibana.space_ids': [spaceId, '*'],
        },
      },
      { range: { '@timestamp': { gte: lookback } } },
    ];
    if (ruleUuid) {
      filter.push({ term: { 'kibana.alert.rule.uuid': ruleUuid } });
    }

    const response = await esClient.search('significant_events_alerts_v1_count_alerts', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: true,
      query: { bool: { filter } },
    });

    const total = response.hits.total;
    return typeof total === 'number' ? total : total?.value ?? 0;
  }

  async runChangePointScan(
    esClient: TracedElasticsearchClient,
    params: ChangePointScanParams,
    queryLinks: QueryLink[]
  ) {
    const ruleMetadata = buildRuleMetadataMap(queryLinks);
    const response = await esClient.search('significant_events_alerts_v1_change_point_scan', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
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
    const filter: QueryDslQueryContainer[] = [
      ...termsQuery('kibana.space_ids', [spaceId, '*']),
      { range: { '@timestamp': { gte: lookback } } },
    ];
    if (ruleIds?.length) {
      filter.push(...termsQuery('kibana.alert.rule.uuid', ruleIds));
    }

    return {
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        by_rule: {
          terms: { field: 'kibana.alert.rule.uuid', size: RULES_BUCKET_SIZE },
          aggs: {
            rule_name: {
              top_metrics: {
                metrics: [{ field: 'kibana.alert.rule.name' }],
                sort: { '@timestamp': 'desc' },
                size: 1,
              },
            },
            stream: {
              terms: { field: 'kibana.alert.rule.tags', exclude: 'streams', size: 1 },
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
    // These sub-aggs are absent when a rule produced too few/no docs in the window: ES omits the
    // `change_points` result, the `rule_name` top hit, and the `stream` terms buckets. We then fall
    // back to the rule/stream identity from the queryLinks metadata so the bucket shape stays stable.
    const meta = ruleMetadata.get(bucket.key);
    const ruleName = meta?.ruleName ?? 'unknown';
    const streamName = meta?.streamName ?? 'unknown';
    const changePoints = bucket.change_points?.type
      ? { type: bucket.change_points.type }
      : { type: EMPTY_CHANGE_POINT_TYPE };
    const ruleNameAgg = bucket.rule_name?.top?.[0]?.metrics
      ? { top: [{ metrics: bucket.rule_name.top[0].metrics }] }
      : { top: [{ metrics: { 'kibana.alert.rule.name': ruleName } }] };
    const streamAgg = bucket.stream?.buckets
      ? { buckets: bucket.stream.buckets }
      : { buckets: [{ key: streamName }] };

    return {
      key: bucket.key,
      doc_count: bucket.doc_count,
      rule_name: ruleNameAgg,
      stream: streamAgg,
      change_points: changePoints,
    };
  }
}
