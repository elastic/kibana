/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_KPI_ACKNOWLEDGE_EVENTS, MAX_KPI_ALERTS } from '../../../../common/constants';
import type { PredefinedKpiMetricConfiguration } from '../../../../common/types/domain';
import type { AlertGeneratedTimes } from '../../../services/alerts';
import { createAlertServiceMock } from '../../../services/mocks';
import {
  aggregateAlertDurations,
  buildAcknowledgeEventSearch,
  buildAlertAttachmentSearch,
  extractAcknowledgeEvents,
  extractAlertCasePairs,
  getAlertAcknowledgedAt,
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

const eventHit = (caseId: string, time: string, type: string = 'status') => ({
  _index: '.cases-activity',
  _id: `${caseId}-${time}`,
  _source: { '@timestamp': time, case: { id: caseId }, action: { type } },
});

const searchResponse = (
  hits: Array<ReturnType<typeof attachmentHit> | ReturnType<typeof eventHit>>,
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
  describe('getAlertAcknowledgedAt', () => {
    const attachedAt = '2026-11-04T10:00:00.000Z';
    const status = (time: string) => ({ time, type: 'status' as const });
    const assignees = (time: string) => ({ time, type: 'assignees' as const });

    it('takes the first event after the attach time', () => {
      expect(
        getAlertAcknowledgedAt({
          attachedAt,
          events: [
            status('2026-11-04T09:00:00.000Z'),
            status('2026-11-04T10:30:00.000Z'),
            assignees('2026-11-04T11:00:00.000Z'),
          ],
        })
      ).toBe('2026-11-04T10:30:00.000Z');
    });

    it('counts an event at the same millisecond as the attach', () => {
      expect(getAlertAcknowledgedAt({ attachedAt, events: [status(attachedAt)] })).toBe(attachedAt);
    });

    it('returns undefined when no event is at or after the attach time', () => {
      expect(
        getAlertAcknowledgedAt({ attachedAt, events: [status('2026-11-04T09:59:59.999Z')] })
      ).toBeUndefined();
      expect(getAlertAcknowledgedAt({ attachedAt, events: [] })).toBeUndefined();
    });

    describe('trigger', () => {
      const events = [status('2026-11-04T10:10:00.000Z'), assignees('2026-11-04T10:30:00.000Z')];

      it.each([
        ['assigned', '2026-11-04T10:30:00.000Z'],
        ['in_progress', '2026-11-04T10:10:00.000Z'],
        ['assigned_or_in_progress', '2026-11-04T10:10:00.000Z'],
        [undefined, '2026-11-04T10:10:00.000Z'],
      ] as const)('with the trigger %s gives %s', (trigger, expected) => {
        expect(getAlertAcknowledgedAt({ attachedAt, events, trigger })).toBe(expected);
      });

      it('gives undefined when no event has the type of the trigger', () => {
        expect(
          getAlertAcknowledgedAt({ attachedAt, events: [status(attachedAt)], trigger: 'assigned' })
        ).toBeUndefined();
      });
    });
  });

  describe('getAlertDurationSeconds', () => {
    const event = (time: string) => ({ time, type: 'status' as const });

    it('ends at the first event after the attach, from the alert start', () => {
      expect(
        getAlertDurationSeconds(
          { alertId: 'a1', caseId: 'c1', attachedAt: '2026-11-04T10:00:00.000Z' },
          { start: '2026-11-04T09:50:00.000Z', timestamp: '2026-11-04T10:00:00.000Z' },
          [event('2026-11-04T11:00:00.000Z')]
        )
      ).toBe(4200);
    });

    it('uses the timestamp when the alert has no start', () => {
      expect(
        getAlertDurationSeconds(
          { alertId: 'a1', caseId: 'c1', attachedAt: '2026-11-04T10:00:00.000Z' },
          { timestamp: '2026-11-04T10:00:00.000Z' },
          [event('2026-11-04T10:00:30.000Z')]
        )
      ).toBe(30);
    });

    it('drops a missing alert, a pair with no event, and a negative duration', () => {
      const pair = { alertId: 'a1', caseId: 'c1', attachedAt: '2026-11-04T10:00:00.000Z' };
      const events = [event('2026-11-04T10:30:00.000Z')];

      expect(getAlertDurationSeconds(pair, undefined, events)).toBeUndefined();
      expect(
        getAlertDurationSeconds(pair, { start: '2026-11-04T09:00:00.000Z' }, [])
      ).toBeUndefined();
      expect(
        getAlertDurationSeconds(pair, { start: '2026-11-04T11:00:00.000Z' }, events)
      ).toBeUndefined();
      expect(getAlertDurationSeconds(pair, {}, events)).toBeUndefined();
    });
  });

  describe('extractAcknowledgeEvents', () => {
    it('groups the events of each case in ascending order, with the action type', () => {
      const events = extractAcknowledgeEvents([
        eventHit('c1', '2026-11-04T12:00:00.000Z'),
        eventHit('c2', '2026-11-04T10:00:00.000Z', 'assignees'),
        eventHit('c1', '2026-11-04T11:00:00.000Z'),
      ]);

      expect(events.get('c1')).toEqual([
        { time: '2026-11-04T11:00:00.000Z', type: 'status' },
        { time: '2026-11-04T12:00:00.000Z', type: 'status' },
      ]);
      expect(events.get('c2')).toEqual([{ time: '2026-11-04T10:00:00.000Z', type: 'assignees' }]);
    });

    it('ignores an event with an action type that is not status or assignees', () => {
      expect(
        extractAcknowledgeEvents([eventHit('c1', '2026-11-04T11:00:00.000Z', 'comment')]).size
      ).toBe(0);
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

  describe('buildAcknowledgeEventSearch', () => {
    const request = buildAcknowledgeEventSearch(
      { ...context, caseIds: ['c1', 'c2'] },
      '2026-11-04T10:00:00.000Z'
    );

    it('keeps the space, owner, and case id clauses as separate filter entries and has no upper date bound', () => {
      expect(request.index).toBe('activity');
      expect(request.body.size).toBe(MAX_KPI_ACKNOWLEDGE_EVENTS);
      expect(request.body.track_total_hits).toBe(true);
      expect(request.body.sort).toEqual([{ '@timestamp': 'asc' }]);
      expect(request.body.query?.bool?.filter).toEqual([
        { term: { space_id: 'kpi-demo' } },
        { term: { owner: 'cases' } },
        { terms: { 'case.id': ['c1', 'c2'] } },
        { range: { '@timestamp': { gte: '2026-11-04T10:00:00.000Z' } } },
        expect.objectContaining({ bool: expect.objectContaining({ minimum_should_match: 1 }) }),
      ]);
      expect(JSON.stringify(request.body.query)).not.toContain('lte');
    });

    it('selects a move to in-progress and an added assignee only', () => {
      const filters = request.body.query?.bool?.filter as Array<{
        bool?: { should?: unknown[] };
      }>;

      expect(filters[4].bool?.should).toEqual([
        {
          bool: {
            filter: [
              { term: { 'action.type': 'status' } },
              { term: { 'action.status_new': 'in-progress' } },
            ],
          },
        },
        {
          bool: {
            filter: [{ term: { 'action.type': 'assignees' } }, { term: { 'action.verb': 'add' } }],
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

    // The attachments come in the first call and the events come in later calls, in order.
    const mockSearches = ({
      attachments,
      events = [],
    }: {
      attachments: estypes.MsearchResponseItem[];
      events?: estypes.MsearchResponseItem[];
    }) => {
      const eventQueue = [...events];

      reader.msearch.mockImplementation(async (requests: Array<{ index: string }>) =>
        requests[0].index === 'activity' ? [eventQueue.shift() ?? searchResponse([])] : attachments
      );
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('reads the attachments with the analytics reader and the alerts with the alerts service', async () => {
      mockSearches({
        attachments: [
          searchResponse([attachmentHit('c1', '2026-11-04T10:01:00.000Z', ['a1', 'a2'])]),
        ],
        events: [searchResponse([eventHit('c1', '2026-11-04T10:01:30.000Z')])],
      });
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
        { id: 'tta-avg', type: 'value', format: 'duration', value: 135 },
        { id: 'tta-median', type: 'value', format: 'duration', value: 135 },
      ]);
      expect(reader.msearch).toHaveBeenCalledTimes(2);
      expect(reader.msearch.mock.calls[0][0].map(({ index }: { index: string }) => index)).toEqual([
        'attachments',
      ]);
      expect(reader.msearch.mock.calls[1][0].map(({ index }: { index: string }) => index)).toEqual([
        'activity',
      ]);
      expect(alertsService.getAlertGeneratedTimes).toHaveBeenCalledWith({
        ids: ['a1', 'a2'],
        indices: ['.alerts-stack.alerts-default'],
      });
    });

    it('gives the previous value for the previous period', async () => {
      mockSearches({
        attachments: [
          searchResponse([attachmentHit('c1', '2026-11-04T10:01:00.000Z', ['a1'])]),
          searchResponse([attachmentHit('c2', '2026-10-28T10:02:00.000Z', ['a2'])]),
        ],
        events: [
          searchResponse([eventHit('c1', '2026-11-04T10:01:00.000Z')]),
          searchResponse([eventHit('c2', '2026-10-28T10:02:00.000Z')]),
        ],
      });
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
      expect(reader.msearch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        id: 'tta-avg',
        type: 'value',
        format: 'duration',
        value: 60,
        previousValue: 120,
      });
    });

    it('gives an error and no partial value when the attachments are over the limit', async () => {
      mockSearches({ attachments: [searchResponse([], MAX_KPI_ALERTS + 1)] });

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
      mockSearches({
        attachments: [searchResponse([attachmentHit('c1', '2026-11-04T10:01:00.000Z', ['a1'])])],
      });
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
      mockSearches({ attachments: [searchResponse([])] });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(alerts({}));

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [medianMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({ id: 'tta-median', type: 'value', format: 'duration', value: null });
    });

    it('gives the InfoSec flow value: the pickup at 11:00 after the attach at 10:00', async () => {
      mockSearches({
        attachments: [searchResponse([attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1'])])],
        events: [searchResponse([eventHit('c1', '2026-11-04T11:00:00.000Z')])],
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({ a1: { start: '2026-11-04T09:50:00.000Z' } })
      );

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({ id: 'tta-avg', type: 'value', format: 'duration', value: 4200 });
    });

    it('gives two alerts of one case different acknowledged times', async () => {
      mockSearches({
        attachments: [
          searchResponse([
            attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1']),
            attachmentHit('c1', '2026-11-04T12:00:00.000Z', ['a2']),
          ]),
        ],
        events: [
          searchResponse([
            eventHit('c1', '2026-11-04T10:30:00.000Z', 'assignees'),
            eventHit('c1', '2026-11-04T13:00:00.000Z'),
          ]),
        ],
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({
          a1: { start: '2026-11-04T10:00:00.000Z' },
          a2: { start: '2026-11-04T12:00:00.000Z' },
        })
      );

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({
        id: 'tta-avg',
        type: 'value',
        format: 'duration',
        value: (1800 + 3600) / 2,
      });
    });

    it('leaves out a pair with no event and gives a null value with no pair left', async () => {
      mockSearches({
        attachments: [searchResponse([attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1'])])],
        events: [searchResponse([eventHit('c1', '2026-11-04T09:00:00.000Z')])],
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({ a1: { start: '2026-11-04T09:50:00.000Z' } })
      );

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({ id: 'tta-avg', type: 'value', format: 'duration', value: null });
    });

    it('searches the events of the case ids of the pairs, since the earliest attach time', async () => {
      mockSearches({
        attachments: [
          searchResponse([
            attachmentHit('c1', '2026-11-04T11:00:00.000Z', ['a1']),
            attachmentHit('c2', '2026-11-04T10:00:00.000Z', ['a2']),
          ]),
        ],
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(alerts({}));

      await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context: { ...context, from: '2026-11-01T00:00:00.000Z', to: '2026-11-08T00:00:00.000Z' },
        reader,
        alertsService,
      });

      const [[request]] = reader.msearch.mock.calls[1];
      expect(request.index).toBe('activity');
      expect(request.body.query.bool.filter).toEqual(
        expect.arrayContaining([
          { terms: { 'case.id': ['c1', 'c2'] } },
          { range: { '@timestamp': { gte: '2026-11-04T10:00:00.000Z' } } },
        ])
      );
      expect(JSON.stringify(request.body.query)).not.toContain('2026-11-08');
      expect(alertsService.getAlertGeneratedTimes).toHaveBeenCalledTimes(1);
    });

    it('gives an error when the events are over the limit', async () => {
      mockSearches({
        attachments: [searchResponse([attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1'])])],
        events: [searchResponse([], MAX_KPI_ACKNOWLEDGE_EVENTS + 1)],
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({ a1: { start: '2026-11-04T09:50:00.000Z' } })
      );

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
    });

    it('gives an error when the event search fails', async () => {
      reader.msearch.mockImplementation(async (requests: Array<{ index: string }>) => {
        if (requests[0].index === 'activity') {
          throw new Error('boom');
        }

        return [searchResponse([attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1'])])];
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({ a1: { start: '2026-11-04T09:50:00.000Z' } })
      );

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({
        id: 'tta-avg',
        type: 'error',
        message: 'The metric search failed.',
      });
    });

    it('gives an error when the event search is incomplete', async () => {
      mockSearches({
        attachments: [searchResponse([attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1'])])],
        events: [{ ...searchResponse([]), timed_out: true }],
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({ a1: { start: '2026-11-04T09:50:00.000Z' } })
      );

      const [result] = await runAlertTimeToAcknowledgeMetrics({
        metrics: [avgMetric],
        context,
        reader,
        alertsService,
      });

      expect(result).toEqual({
        id: 'tta-avg',
        type: 'error',
        message: 'The metric search returned incomplete results.',
      });
    });

    it('gives each metric its own trigger from one search for each period', async () => {
      mockSearches({
        attachments: [searchResponse([attachmentHit('c1', '2026-11-04T10:00:00.000Z', ['a1'])])],
        events: [
          searchResponse([
            eventHit('c1', '2026-11-04T10:10:00.000Z'),
            eventHit('c1', '2026-11-04T10:30:00.000Z', 'assignees'),
          ]),
        ],
      });
      alertsService.getAlertGeneratedTimes.mockResolvedValue(
        alerts({ a1: { start: '2026-11-04T10:00:00.000Z' } })
      );

      const results = await runAlertTimeToAcknowledgeMetrics({
        metrics: [
          { ...avgMetric, id: 'assigned', acknowledgeTrigger: 'assigned' },
          { ...avgMetric, id: 'in-progress', acknowledgeTrigger: 'in_progress' },
          { ...avgMetric, id: 'first', acknowledgeTrigger: 'assigned_or_in_progress' },
          { ...avgMetric, id: 'none' },
        ],
        context,
        reader,
        alertsService,
      });

      expect(results.map((result) => ('value' in result ? result.value : undefined))).toEqual([
        1800, 600, 600, 600,
      ]);
      expect(reader.msearch).toHaveBeenCalledTimes(2);
    });

    it('runs no search with no metric', async () => {
      await expect(
        runAlertTimeToAcknowledgeMetrics({ metrics: [], context, reader, alertsService })
      ).resolves.toEqual([]);
      expect(reader.msearch).not.toHaveBeenCalled();
    });
  });
});
