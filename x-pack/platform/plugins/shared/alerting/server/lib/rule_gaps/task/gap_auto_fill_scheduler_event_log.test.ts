/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEvent, IEventLogger } from '@kbn/event-log-plugin/server';
import { EVENT_LOG_ACTIONS } from '../../../plugin';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { createGapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';

describe('gap_auto_fill_scheduler_event_log', () => {
  const fixedStart = new Date('2024-01-01T00:00:00.000Z');
  let eventLogger: jest.Mocked<IEventLogger>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:10.000Z'));

    // Use shared Kibana mock for event logger
    eventLogger = eventLoggerMock.create() as unknown as jest.Mocked<IEventLogger>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const makeArgs = () => ({
    eventLogger: eventLogger as unknown as IEventLogger,
    context: { spaceId: 'default' },
    taskInstance: { id: 'task-123', scheduledAt: new Date('2024-01-01T00:00:05.000Z') },
    startTime: fixedStart,
    config: {
      name: 'gap-fill-auto-fill-name',
      enabled: true,
      numRetries: 3,
      gapFillRange: 'now-7d',
      maxBackfills: 10,
      ruleTypes: [],
      ruleTypeConsumerPairs: [],
      schedule: { interval: '1h' },
      createdBy: null,
      updatedBy: null,
      scope: ['internal'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  });

  it('logs expected event with results and summary', () => {
    const log = createGapAutoFillSchedulerEventLogger(makeArgs());

    log({
      status: 'success',
      results: [
        { ruleId: 'r-1', processedGaps: 5, status: 'success' },
        { ruleId: 'r-2', processedGaps: 2, status: 'error', error: 'boom' },
      ],
      message: 'done',
    });

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    const [event] = eventLogger.logEvent.mock.calls[0] as [IEvent];

    // action and message
    expect(event).toEqual(
      expect.objectContaining({
        event: { action: EVENT_LOG_ACTIONS.gapAutoFillSchedule },
        message: 'done',
      })
    );

    // kibana fields
    expect(event).toEqual(
      expect.objectContaining({
        kibana: expect.objectContaining({
          space_ids: ['default'],
          task: expect.objectContaining({ id: 'task-123', scheduled: '2024-01-01T00:00:05.000Z' }),
          saved_objects: [
            expect.objectContaining({ rel: 'primary', type: 'task', id: 'task-123' }),
          ],
        }),
      })
    );

    // gap_auto_fill payload
    const gapAutoFill = event?.kibana?.gap_auto_fill;
    expect(gapAutoFill).toBeDefined();
    expect(gapAutoFill?.execution).toBeDefined();
    const exec = gapAutoFill!.execution!;
    expect(exec.status).toBe('success');
    expect(exec.start).toBe('2024-01-01T00:00:00.000Z');
    expect(exec.end).toBe('2024-01-01T00:00:10.000Z');
    expect(exec.duration_ms).toBe(10000);
    expect(exec.rule_ids).toEqual(['r-1', 'r-2']);
    expect(exec.results).toEqual([
      { rule_id: 'r-1', processed_gaps: 5, status: 'success', error: undefined },
      { rule_id: 'r-2', processed_gaps: 2, status: 'error', error: 'boom' },
    ]);
  });

  it('supports skipped status and empty results', () => {
    const log = createGapAutoFillSchedulerEventLogger(makeArgs());

    log({
      status: 'skipped',
      results: [],
      message: 'nothing to do',
    });

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    const [evt] = eventLogger.logEvent.mock.calls[0] as [IEvent];
    const gapAutoFill = evt?.kibana?.gap_auto_fill;
    expect(gapAutoFill).toBeDefined();
    expect(gapAutoFill?.execution).toBeDefined();
    const exec = gapAutoFill!.execution!;
    expect(exec.status).toBe('skipped');
    expect(exec.rule_ids).toEqual([]);
    expect(exec.results).toEqual([]);
  });
});
