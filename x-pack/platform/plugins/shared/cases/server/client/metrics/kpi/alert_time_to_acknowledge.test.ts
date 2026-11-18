/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_KPI_ALERTS } from '../../../../common/constants';
import type { PredefinedKpiMetricConfiguration } from '../../../../common/types/domain';
import type { AlertGeneratedTimes } from '../../../services/alerts';
import { createAlertServiceMock } from '../../../services/mocks';
import {
  aggregateAlertDurations,
  buildAlertAttachmentSearch,
  extractAlertCasePairs,
  getAlertDurationSeconds,
  runAlertTimeToAcknowledgeMetrics,
} from './alert_time_to_acknowledge';

const context = { spaceId: 'kpi-demo', owner: 'cases' };

const attachmentHit = (
  caseId: string,
  attachedAt: string,
  alertIds: string[],
  indices: string[] = ['.alerts-stack.alerts-default']
) => ({
  _index: '.cases-attachments',
  _id: `${caseId}-${attachedAt}`,
  _source: {
    '@timestamp': attachedAt,
    case: { id: caseId },
    attachment: { attachment_id: alertIds, alert: { indices } },
  },
});

const searchResponse = (
  hits: Array<ReturnType<typeof attachmentHit>>,
  total: number = hits.length
): estypes.MsearchResponseItem => ({
  took: 1,
  timed_out: false,
  status: 200,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { total: { value: total, relation: 'eq' }, hits },
});

const avgMetric: PredefinedKpiMetricConfiguration = {
  id: 'tta-avg',
  kind: 'predefined',
  predefinedId: 'alert_time_to_acknowledge_avg',
  display: 'value',
};

const medianMetric: PredefinedKpiMetricConfiguration = {
  id: 'tta-median',
  kind: 'predefined',
  predefinedId: 'alert_time_to_acknowledge_median',
  display: 'value',
};

describe('alert time to acknowledge', () => {
  describe('getAlertDurationSeconds', () => {
    it('uses the alert start, not the moved timestamp, for the live case', () => {
      expect(
        getAlertDurationSeconds(
          { alertId: 'a1', caseId: 'c1', attachedAt: '2026-11-04T09:43:52.466Z' },
          { start: '2026-11-04T09:42:15.885Z', timestamp: '2026-11-04T10:39:11.627Z' }
        )
      ).toBe(96.581);
    });

    it('uses the timestamp when the alert has no start', () => {
      expect(
        getAlertDurationSeconds(
          { alertId: 'a1', caseId: 'c1', attachedAt: '2026-11-04T10:00:30.000Z' },
          { timestamp: '2026-11-04T10:00:00.000Z' }
        )
      ).toBe(30);
    });

    it('drops a missing alert and a negative duration', () => {
      const pair = { alertId: 'a1', caseId: 'c1', attachedAt: '2026-11-04T10:00:00.000Z' };

      expect(getAlertDurationSeconds(pair, undefined)).toBeUndefined();
      expect(getAlertDurationSeconds(pair, { start: '2026-11-04T11:00:00.000Z' })).toBeUndefined();
      expect(getAlertDurationSeconds(pair, {})).toBeUndefined();
    });
  });

  describe('extractAlertCasePairs', () => {
    it('gives one pair for each alert id of a document', () => {
      const { pairs } = extractAlertCasePairs([
        attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1', 'a2']),
      ]);

      expect(pairs.map(({ alertId }) => alertId)).toEqual(['a1', 'a2']);
    });

    it('keeps the earliest attach time of the same alert in one case', () => {
      const { pairs } = extractAlertCasePairs([
        attachmentHit('c1', '2026-11-04T11:00:00.000Z', ['a1']),
        attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1']),
      ]);

      expect(pairs).toEqual([
        { alertId: 'a1', caseId: 'c1', attachedAt: '2026-11-04T10:00:00.000Z' },
      ]);
    });

    it('gives one pair for each case of the same alert', () => {
      const { pairs } = extractAlertCasePairs([
        attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1']),
        attachmentHit('c2', '2026-11-04T11:00:00.000Z', ['a1']),
      ]);

      expect(pairs.map(({ caseId }) => caseId)).toEqual(['c1', 'c2']);
    });

    it('returns the union of the alert indices', () => {
      const { indices } = extractAlertCasePairs([
        attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1'], ['index-a']),
        attachmentHit('c2', '2026-11-04T11:00:00.000Z', ['a2'], ['index-a', 'index-b']),
      ]);

      expect(indices).toEqual(['index-a', 'index-b']);
    });
  });

  describe('aggregateAlertDurations', () => {
    it('calculates the average', () => {
      expect(aggregateAlertDurations([10, 20, 60], 'avg')).toBe(30);
    });

    it('takes the mean of the two middle values as the median of an even count', () => {
      expect(aggregateAlertDurations([40, 10, 30, 20], 'median')).toBe(25);
    });

    it('takes the middle value as the median of an odd count', () => {
      expect(aggregateAlertDurations([30, 10, 20], 'median')).toBe(20);
    });

    it('returns null with no durations', () => {
      expect(aggregateAlertDurations([], 'avg')).toBeNull();
    });
  });

  describe('buildAlertAttachmentSearch', () => {
    it('keeps the space, owner, case id, and date range clauses as separate filter entries', () => {
      const request = buildAlertAttachmentSearch({
        ...context,
        from: 'now-7d',
        to: 'now',
        caseIds: ['c1'],
      });

      expect(request.index).toBe('attachments');
      expect(request.body.size).toBe(MAX_KPI_ALERTS);
      expect(request.body.track_total_hits).toBe(true);
      expect(request.body.query?.bool?.filter).toEqual([
        { term: { space_id: 'kpi-demo' } },
        { term: { owner: 'cases' } },
        { terms: { 'case.id': ['c1'] } },
        { range: { '@timestamp': { gte: 'now-7d', lte: 'now' } } },
        {
          terms: {
            'attachment.type': ['alert', 'security.alert', 'observability.alert', 'stack.alert'],
          },
        },
      ]);
    });
  });

  describe('runAlertTimeToAcknowledgeMetrics', () => {
    const reader = { msearch: jest.fn() };
    const alertsService = createAlertServiceMock();

    const alerts = (entries: Record<string, AlertGeneratedTimes>) => ({
      readable: true as const,
      alerts: new Map(Object.entries(entries)),
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('reads the attachments with the analytics reader and the alerts with the alerts service', async () => {
      reader.msearch.mockResolvedValue([
        searchResponse([attachmentHit('c1', '2026-11-04T10:01:00.000Z', ['a1', 'a2'])]),
      ]);
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({
          a1: { start: '2026-11-04T10:00:00.000Z' },
          a2: { start: '2026-11-04T09:59:00.000Z' },
        })
      );

      const results = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric, medianMetric],
        context,
        reader,
        alertsService,
      });

      expect(results).toEqual([
        { id: 'tta-avg', type: 'value', format: 'duration', value: 90 },
        { id: 'tta-median', type: 'value', format: 'duration', value: 90 },
      ]);
      expect(reader.msearch).toHaveBeenCalledTimes(1);
      expect(reader.msearch.mock.calls[0][0].map(({ index }: { index: string }) => index)).toEqual([
        'attachments',
      ]);
      expect(alertsService.getAlertGeneratedTimes).toHaveBeenCalledWith({
        ids: ['a1', 'a2'],
        indices: ['.alerts-stack.alerts-default'],
      });
    });

    it('gives the previous value for the previous period', async () => {
      reader.msearch.mockResolvedValue([
        searchResponse([attachmentHit('c1', '2026-11-04T10:01:00.000Z', ['a1'])]),
        searchResponse([attachmentHit('c2', '2026-10-28T10:02:00.000Z', ['a2'])]),
      ]);
      alertsService.getAlertGeneratedTimes.mockImplementation(async ({ ids }) =>
        ids[0] === 'a1'
          ? alerts({ a1: { start: '2026-11-04T10:00:00.000Z' } })
          : alerts({ a2: { start: '2026-10-28T10:00:00.000Z' } })
      );

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context: { ...context, from: '2026-11-01T00:00:00.000Z', to: '2026-11-08T00:00:00.000Z' },
        reader,
        alertsService,
      });

      expect(reader.msearch.mock.calls[0][0]).toHaveLength(2);
      expect(result).toEqual({
        id: 'tta-avg',
        type: 'value',
        format: 'duration',
        value: 60,
        previousValue: 120,
      });
    });

    it('gives an error and no partial value when the attachments are over the limit', async () => {
      reader.msearch.mockResolvedValue([searchResponse([], MAX_KPI_ALERTS + 1)]);

      const results = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric, medianMetric],
        context,
        reader,
        alertsService,
      });

      expect(results).toEqual([
        expect.objectContaining({ id: 'tta-avg', type: 'error' }),
        expect.objectContaining({ id: 'tta-median', type: 'error' }),
      ]);
      expect(results[0]).toHaveProperty(
        'message',
        expect.stringContaining('Select a shorter range')
      );
      expect(alertsService.getAlertGeneratedTimes).not.toHaveBeenCalled();
    });

    it('gives an error when the user cannot read the alerts', async () => {
      reader.msearch.mockResolvedValue([
        searchResponse([attachmentHit('c1', '2026-11-04T10:01:00.000Z', ['a1'])]),
      ]);
      alertsService.getAlertGeneratedTimes.mockResolvedValue({ readable: false });

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({
        id: 'tta-avg',
        type: 'error',
        message: 'You do not have permission to read the alerts of these cases.',
      });
    });

    it('gives a null value when no alert has a duration', async () => {
      reader.msearch.mockResolvedValue([searchResponse([])]);
      alertsService.getAlertGeneratedTimes.mockResolvedValue(alerts({}));

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [medianMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({ id: 'tta-median', type: 'value', format: 'duration', value: null });
    });

    it('runs no search with no metric', async () => {
      await expect(
        runAlertTimeToAcknowledgeMetrics({ metrics: [], context, reader, alertsService })
      ).resolves.toEqual([]);
      expect(reader.msearch).not.toHaveBeenCalled();
    });
  });
});
