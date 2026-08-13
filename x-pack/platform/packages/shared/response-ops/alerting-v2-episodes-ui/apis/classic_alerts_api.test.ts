/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import {
  fetchV1AlertsAsEpisodes,
  fetchV1AlertsKpis,
  fetchV1AlertsHistogram,
  fetchV1AlertsTags,
  fetchV1AlertById,
} from './classic_alerts_api';
import { CLASSIC_ALERT_EPISODE_SOURCE_FIELDS } from '../classic_alerts/map_alert';
import type { TimeBucket } from '../utils/histogram_utils';

const mockHttp = httpServiceMock.createStartContract();

const makeHit = (source: Record<string, unknown>) => ({
  _id: 'hit-1',
  _index: '.alerts-observability.test',
  _source: source,
});

describe('classic_alerts_api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchV1AlertsAsEpisodes', () => {
    it('calls the RAC find endpoint and maps hits to episodes', async () => {
      mockHttp.post.mockResolvedValue({
        hits: {
          hits: [
            makeHit({
              'kibana.alert.uuid': 'uuid-1',
              'kibana.alert.status': 'active',
              'kibana.alert.rule.uuid': 'rule-1',
              'kibana.alert.rule.name': 'Test Rule',
              '@timestamp': '2024-01-01T00:00:00.000Z',
            }),
          ],
        },
      });

      const episodes = await fetchV1AlertsAsEpisodes({
        pageSize: 100,
        services: { http: mockHttp },
      });

      const [, callOptions] = mockHttp.post.mock.calls[0] as unknown as [string, { body: string }];
      const body = JSON.parse(callOptions.body);
      expect(body._source).toEqual([...CLASSIC_ALERT_EPISODE_SOURCE_FIELDS]);
      expect(episodes).toHaveLength(1);
      expect(episodes[0].supports_actions).toBe(false);
      expect(episodes[0].supports_timeline).toBe(false);
    });

    it('skips hits without _source', async () => {
      mockHttp.post.mockResolvedValue({
        hits: { hits: [{ _id: 'no-source' }] },
      });

      const episodes = await fetchV1AlertsAsEpisodes({
        pageSize: 100,
        services: { http: mockHttp },
      });

      expect(episodes).toHaveLength(0);
    });
  });

  describe('fetchV1AlertsKpis', () => {
    it('returns KPI counts from aggregations', async () => {
      mockHttp.post.mockResolvedValue({
        hits: { total: { value: 42 }, hits: [] },
        aggregations: {
          firing_rules: { doc_count: 5, rules: { value: 3 } },
          acknowledged: { doc_count: 7 },
          muted: { doc_count: 2 },
          snoozed: { doc_count: 1 },
        },
      });

      const kpis = await fetchV1AlertsKpis({ services: { http: mockHttp } });

      expect(kpis.alerts_count).toBe(42);
      expect(kpis.firing_rules).toBe(3);
      expect(kpis.acknowledged).toBe(7);
      expect(kpis.snoozed).toBe(3); // muted + snoozed
    });

    it('handles missing aggregations gracefully', async () => {
      mockHttp.post.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      const kpis = await fetchV1AlertsKpis({ services: { http: mockHttp } });

      expect(kpis.alerts_count).toBe(0);
      expect(kpis.firing_rules).toBe(0);
      expect(kpis.acknowledged).toBe(0);
      expect(kpis.snoozed).toBe(0);
    });
  });

  describe('fetchV1AlertsHistogram', () => {
    const buckets: TimeBucket[] = [
      {
        start: new Date('2024-01-01T00:00:00.000Z').getTime(),
        end: new Date('2024-01-01T01:00:00.000Z').getTime(),
      },
      {
        start: new Date('2024-01-01T01:00:00.000Z').getTime(),
        end: new Date('2024-01-01T02:00:00.000Z').getTime(),
      },
    ];

    it('uses server-side filter aggregations and returns pre-computed bucket counts', async () => {
      mockHttp.post.mockResolvedValue({
        hits: { hits: [] },
        aggregations: {
          bucket_0: { doc_count: 3 },
          bucket_1: { doc_count: 1 },
        },
      });

      const counts = await fetchV1AlertsHistogram({ services: { http: mockHttp }, buckets });

      const [, callOptions] = mockHttp.post.mock.calls[0] as unknown as [string, { body: string }];
      const body = JSON.parse(callOptions.body);
      expect(body.size).toBe(0);
      expect(body._source).toBe(false);
      expect(body.aggs).toHaveProperty('bucket_0');
      expect(body.aggs).toHaveProperty('bucket_1');
      expect(counts).toEqual([
        { bucketStart: buckets[0].start, count: 3 },
        { bucketStart: buckets[1].start, count: 1 },
      ]);
    });

    it('returns pre-computed breakdown counts when breakdownField is provided', async () => {
      mockHttp.post.mockResolvedValue({
        hits: { hits: [] },
        aggregations: {
          bucket_0: {
            doc_count: 2,
            breakdown: { buckets: [{ key: 'critical', doc_count: 2 }] },
          },
          bucket_1: { doc_count: 0, breakdown: { buckets: [] } },
        },
      });

      const counts = await fetchV1AlertsHistogram({
        services: { http: mockHttp },
        buckets,
        breakdownField: 'kibana.alert.severity',
      });

      expect(counts).toEqual([{ bucketStart: buckets[0].start, count: 2, breakdown: 'critical' }]);
    });

    it('returns empty array when no buckets are provided', async () => {
      const counts = await fetchV1AlertsHistogram({ services: { http: mockHttp }, buckets: [] });
      expect(counts).toEqual([]);
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });

  describe('fetchV1AlertsTags', () => {
    it('extracts tag keys from the terms aggregation', async () => {
      mockHttp.post.mockResolvedValue({
        hits: { hits: [] },
        aggregations: {
          tags: {
            buckets: [
              { key: 'production', doc_count: 10 },
              { key: 'staging', doc_count: 5 },
            ],
          },
        },
      });

      const tags = await fetchV1AlertsTags({ services: { http: mockHttp } });

      expect(tags).toEqual(['production', 'staging']);
    });

    it('returns empty array when no buckets', async () => {
      mockHttp.post.mockResolvedValue({
        hits: { hits: [] },
        aggregations: { tags: { buckets: [] } },
      });

      const tags = await fetchV1AlertsTags({ services: { http: mockHttp } });
      expect(tags).toEqual([]);
    });
  });

  describe('fetchV1AlertById', () => {
    it('returns the full source with _index and _id', async () => {
      mockHttp.post.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'doc-id',
              _index: '.alerts-observability.metrics',
              _source: { 'kibana.alert.uuid': 'target-uuid', 'kibana.alert.status': 'active' },
            },
          ],
        },
      });

      const result = await fetchV1AlertById({ id: 'target-uuid', services: { http: mockHttp } });

      expect(result['kibana.alert.uuid']).toBe('target-uuid');
      expect(result._index).toBe('.alerts-observability.metrics');
      expect(result._id).toBe('doc-id');
    });

    it('throws when the alert is not found', async () => {
      mockHttp.post.mockResolvedValue({ hits: { hits: [] } });

      await expect(
        fetchV1AlertById({ id: 'missing', services: { http: mockHttp } })
      ).rejects.toThrow('Classic alert not found: missing');
    });
  });
});
