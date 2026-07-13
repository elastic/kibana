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
  RECENT_ACTIVITY_MINUTES,
  buildChangePointHistogramBounds,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';
import type {
  ChangePointRuleBucket,
  ChangePointTypeMap,
  ChangePointScanParams,
  CountDetectionAlertsParams,
  RuleActivityAggregations,
  RuleAlertWindowAggregations,
  RuleChangePointAggregations,
  RuleMetadata,
} from './alerts_reader';
import {
  type ISignificantEventsAlertsReader,
  type OccurrencesEsqlParams,
  buildRuleMetadataMap,
} from './alerts_reader';
import { getRuleDetectionSchedule } from '../rules/schedule';

const EMPTY_CHANGE_POINT_TYPE: ChangePointTypeMap = {};

interface RawSignalCountAggregation {
  value?: number;
}

interface RawSignalWindowAggregation {
  doc_count?: number;
  signal_count?: RawSignalCountAggregation;
}

interface RawRuleBucket {
  key: string;
  doc_count: number;
  signal_count?: RawSignalCountAggregation;
  change_points?: { type?: ChangePointTypeMap };
  last_5m?: RawSignalWindowAggregation;
  last_floor_window?: RawSignalWindowAggregation;
}

interface RawRuleActivityAggregations {
  activity_windows?: {
    buckets?: Array<{ key: string | number; signal_count?: RawSignalCountAggregation }>;
  };
  peak?: RuleActivityAggregations['peak'];
}

interface RawRuleAlertWindowAggregations {
  current_window?: RawSignalWindowAggregation;
  reference_window?: RawSignalWindowAggregation;
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

  async runRuleChangePoint(
    esClient: TracedElasticsearchClient,
    {
      ruleUuid,
      lookback,
      bucketInterval,
      spaceId,
    }: Parameters<ISignificantEventsAlertsReader['runRuleChangePoint']>[1]
  ) {
    const response = await esClient.search('significant_events_alerts_v2_rule_change_point', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: spaceId } },
            { term: { 'rule.id': ruleUuid } },
            { range: { '@timestamp': { gte: lookback } } },
          ],
        },
      },
      aggs: buildChangePointTimeSeriesAggs(bucketInterval, {
        useDistinctSignalCount: true,
        extendedBounds: { min: lookback, max: 'now' },
      }),
    });

    return { aggregations: (response.aggregations ?? {}) as RuleChangePointAggregations };
  }

  async runRuleActivity(
    esClient: TracedElasticsearchClient,
    {
      ruleUuid,
      lookback,
      windowInterval,
      spaceId,
    }: Parameters<ISignificantEventsAlertsReader['runRuleActivity']>[1]
  ) {
    const response = await esClient.search('significant_events_alerts_v2_rule_activity', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: spaceId } },
            { term: { 'rule.id': ruleUuid } },
            { range: { '@timestamp': { gte: lookback } } },
          ],
        },
      },
      aggs: {
        activity_windows: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: windowInterval,
            min_doc_count: 0,
          },
          aggs: {
            signal_count: {
              cardinality: { field: 'group_hash' },
            },
          },
        },
        peak: {
          max_bucket: { buckets_path: 'activity_windows>signal_count' },
        },
      },
    });

    return {
      aggregations: this.normalizeActivityAggregations(
        (response.aggregations ?? {}) as RawRuleActivityAggregations
      ),
    };
  }

  async runRuleAlertWindows(
    esClient: TracedElasticsearchClient,
    {
      ruleUuid,
      currentLookback,
      referenceLookbackGte,
      referenceLookbackLt,
      spaceId,
    }: Parameters<ISignificantEventsAlertsReader['runRuleAlertWindows']>[1]
  ) {
    const response = await esClient.search('significant_events_alerts_v2_rule_alert_windows', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: spaceId } },
            { term: { 'rule.id': ruleUuid } },
          ],
        },
      },
      aggs: {
        current_window: {
          filter: { range: { '@timestamp': { gte: currentLookback } } },
          aggs: {
            signal_count: {
              cardinality: { field: 'group_hash' },
            },
          },
        },
        reference_window: {
          filter: {
            range: {
              '@timestamp': { gte: referenceLookbackGte, lt: referenceLookbackLt },
            },
          },
          aggs: {
            signal_count: {
              cardinality: { field: 'group_hash' },
            },
          },
        },
      },
    });

    return {
      aggregations: this.normalizeWindowAggregations(
        (response.aggregations ?? {}) as RawRuleAlertWindowAggregations
      ),
    };
  }

  private buildChangePointScanBody({
    lookback,
    bucketInterval,
    spaceId,
    ruleIds,
    recentActivityMinutes = RECENT_ACTIVITY_MINUTES,
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
              useDistinctSignalCount: true,
              includeFloorWindow: true,
              recentActivityMinutes,
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
    const ruleSchedule = meta?.schedule ?? getRuleDetectionSchedule({});
    const changePoints = bucket.change_points?.type
      ? { type: bucket.change_points.type }
      : { type: EMPTY_CHANGE_POINT_TYPE };

    return {
      key: bucket.key,
      doc_count: bucket.signal_count?.value ?? bucket.doc_count,
      rule_name: { top: [{ metrics: { 'kibana.alert.rule.name': ruleName } }] },
      stream: { buckets: [{ key: streamName }] },
      change_points: changePoints,
      last_5m: { doc_count: this.distinctSignalCount(bucket.last_5m) },
      last_floor_window: { doc_count: this.distinctSignalCount(bucket.last_floor_window) },
      rule_schedule: ruleSchedule,
    };
  }

  private distinctSignalCount(window?: {
    doc_count?: number;
    signal_count?: RawSignalCountAggregation;
  }): number {
    return window?.signal_count?.value ?? window?.doc_count ?? 0;
  }

  private normalizeWindowAggregations(
    aggregations: RawRuleAlertWindowAggregations
  ): RuleAlertWindowAggregations {
    const normalizeWindow = (window: RawSignalWindowAggregation | undefined) => {
      if (!window) {
        return window;
      }
      return { doc_count: window.signal_count?.value ?? window.doc_count ?? 0 };
    };

    return {
      current_window: normalizeWindow(aggregations.current_window),
      reference_window: normalizeWindow(aggregations.reference_window),
    };
  }

  private normalizeActivityAggregations(
    aggregations: RawRuleActivityAggregations
  ): RuleActivityAggregations {
    if (!aggregations.activity_windows?.buckets) {
      return { peak: aggregations.peak };
    }

    return {
      activity_windows: {
        buckets: aggregations.activity_windows.buckets.map((bucket) => ({
          key: bucket.key,
          doc_count: bucket.signal_count?.value ?? 0,
        })),
      },
      peak: aggregations.peak,
    };
  }
}
