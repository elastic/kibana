/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type ResolvedDetectionAlertsSource,
  V2_ALERTS_SOURCE,
} from './detection_alerts_source';
import { ALERTS_DATA_STREAM, RULE_EVENTS_DATA_STREAM } from '../alerts_data_stream';

export interface CountDetectionAlertsParams {
  lookback: string;
  spaceId: string;
  ruleUuid?: string;
}

export interface CountDetectionAlertsResult extends ResolvedDetectionAlertsSource {
  count: number;
}

export async function countDetectionAlerts({
  esClient,
  resolved,
  params,
}: {
  esClient: ElasticsearchClient;
  resolved: ResolvedDetectionAlertsSource;
  params: CountDetectionAlertsParams;
}): Promise<CountDetectionAlertsResult> {
  const { lookback, spaceId, ruleUuid } = params;

  if (resolved.alertsSource === V2_ALERTS_SOURCE) {
    const filter: Array<Record<string, unknown>> = [
      { term: { type: 'signal' } },
      { term: { space_id: spaceId } },
      { range: { '@timestamp': { gte: lookback } } },
    ];
    if (ruleUuid) {
      filter.push({ term: { 'rule.id': ruleUuid } });
    }

    const response = await esClient.count({
      index: RULE_EVENTS_DATA_STREAM,
      ignore_unavailable: true,
      query: { bool: { filter } },
    });

    return { ...resolved, count: response.count };
  }

  const filter: Array<Record<string, unknown>> = [
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

  const response = await esClient.count({
    index: ALERTS_DATA_STREAM,
    ignore_unavailable: true,
    query: { bool: { filter } },
  });

  return { ...resolved, count: response.count };
}
