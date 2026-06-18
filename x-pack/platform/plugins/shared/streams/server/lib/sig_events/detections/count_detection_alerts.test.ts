/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { countDetectionAlerts } from './count_detection_alerts';
import { ALERTS_DATA_STREAM, RULE_EVENTS_DATA_STREAM } from '../alerts_data_stream';
import { V1_ALERTS_SOURCE, V2_ALERTS_SOURCE } from './detection_alerts_source';

describe('countDetectionAlerts', () => {
  const count = jest.fn();

  const esClient = { count } as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
    count.mockResolvedValue({ count: 42 });
  });

  it('counts v1 alerts with space and lookback filters', async () => {
    await countDetectionAlerts({
      esClient,
      resolved: { alertsSource: V1_ALERTS_SOURCE, alertIndex: ALERTS_DATA_STREAM },
      params: { lookback: 'now-30m', spaceId: 'default' },
    });

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ALERTS_DATA_STREAM,
        query: {
          bool: {
            filter: [
              { terms: { 'kibana.space_ids': ['default', '*'] } },
              { range: { '@timestamp': { gte: 'now-30m' } } },
            ],
          },
        },
      })
    );
  });

  it('counts v1 alerts for a single rule when ruleUuid is provided', async () => {
    await countDetectionAlerts({
      esClient,
      resolved: { alertsSource: V1_ALERTS_SOURCE, alertIndex: ALERTS_DATA_STREAM },
      params: { lookback: 'now-11m', spaceId: 'default', ruleUuid: 'rule-1' },
    });

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([{ term: { 'kibana.alert.rule.uuid': 'rule-1' } }]),
          },
        },
      })
    );
  });

  it('counts v2 rule-events with signal and space filters', async () => {
    await countDetectionAlerts({
      esClient,
      resolved: { alertsSource: V2_ALERTS_SOURCE, alertIndex: RULE_EVENTS_DATA_STREAM },
      params: { lookback: 'now-30m', spaceId: 'default' },
    });

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        index: RULE_EVENTS_DATA_STREAM,
        query: {
          bool: {
            filter: [
              { term: { type: 'signal' } },
              { term: { space_id: 'default' } },
              { range: { '@timestamp': { gte: 'now-30m' } } },
            ],
          },
        },
      })
    );
  });

  it('returns count and resolved alerts source metadata', async () => {
    const result = await countDetectionAlerts({
      esClient,
      resolved: { alertsSource: V2_ALERTS_SOURCE, alertIndex: RULE_EVENTS_DATA_STREAM },
      params: { lookback: 'now-30m', spaceId: 'default' },
    });

    expect(result).toEqual({
      alertsSource: V2_ALERTS_SOURCE,
      alertIndex: RULE_EVENTS_DATA_STREAM,
      count: 42,
    });
  });
});
