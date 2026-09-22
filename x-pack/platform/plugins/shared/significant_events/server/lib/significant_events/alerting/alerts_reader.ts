/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { SignificantEventsAlertsReaderV2 } from './v2_alerts_reader';

export interface ChangePointScanParams {
  /** Analysis duration as ES date math (`now-40m`). */
  lookback: string;
  /** Outer date_histogram interval (`1m`, `5m`, …). Must be ≥ 1m. */
  bucketInterval: string;
  spaceId: string;
  ruleIds?: string[];
}

/**
 * Single-entry map of the detector's verdict, keyed by change type. `stationary`
 * carries `{}`; the rest carry `p_value` and `change_point`. Empty when the rule
 * had no verdict or the reader dropped an `indeterminable` one.
 */
export type ChangePointTypeMap = Record<string, { p_value?: number; change_point?: number }>;

export interface ChangePointRuleBucket {
  key: string;
  severity_score: number;
  doc_count: number;
  rule_name: {
    top: Array<{ metrics: Record<string, string> }>;
  };
  stream: {
    buckets: Array<{ key: string }>;
  };
  change_points: {
    type: ChangePointTypeMap;
  };
}

export interface RuleMetadata {
  ruleName: string;
  streamName: string;
  severityScore: number;
}

export interface CountDetectionAlertsParams {
  lookback: string;
  spaceId: string;
  ruleUuid?: string;
}

export interface OccurrencesEsqlParams {
  ruleIds: string[];
  value: number;
  esqlUnit: string;
  limit: number;
  spaceId: string;
  /**
   * Inclusive chart window as UTC ISO-8601 strings. Applied to source `bucket`
   * (match minute), not write-time `@timestamp`. Strings (not `Date`) keep this
   * boundary free of `toISOString` crashes if a caller omits the range.
   */
  rangeFromIso: string;
  rangeToIso: string;
}

export interface ISignificantEventsAlertsReader {
  readonly index: string;
  readonly ruleIdColumn: 'rule_id';

  buildOccurrencesEsqlRequest(params: OccurrencesEsqlParams): EsqlQueryRequest;

  countAlerts(
    esClient: TracedElasticsearchClient,
    params: CountDetectionAlertsParams
  ): Promise<number>;

  runChangePointScan(
    esClient: TracedElasticsearchClient,
    params: ChangePointScanParams,
    queryLinks: QueryLink[]
  ): Promise<{ took?: number; by_rule: { buckets: ChangePointRuleBucket[] } }>;
}

export function buildRuleMetadataMap(queryLinks: QueryLink[]): Map<string, RuleMetadata> {
  const map = new Map<string, RuleMetadata>();
  for (const link of queryLinks) {
    map.set(link.rule_id, {
      ruleName: link.query.title,
      streamName: link.stream_name,
      severityScore: link.query.severity_score ?? 0,
    });
  }
  return map;
}

export const ALERTS_READER_V2: ISignificantEventsAlertsReader =
  new SignificantEventsAlertsReaderV2();
