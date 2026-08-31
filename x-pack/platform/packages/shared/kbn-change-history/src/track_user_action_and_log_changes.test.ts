/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { TrackUserActionParams } from '@kbn/core-user-activity-server';
import { trackUserActionAndLogChanges } from './track_user_action_and_log_changes';

const buildEvent = (overrides: Partial<TrackUserActionParams> = {}): TrackUserActionParams => ({
  message: 'User updated rule "test" (id: rule-1).',
  event: { action: 'alerting_rule_update', type: 'change', outcome: 'success' },
  object: { id: 'rule-1', name: 'test', type: 'rule', tags: [] },
  ...overrides,
});

describe('trackUserActionAndLogChanges', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('awaits the change-history write before emitting user activity', async () => {
    const order: string[] = [];
    const logChanges = jest.fn().mockImplementation(async () => {
      order.push('logChanges');
    });
    const trackUserAction = jest.fn().mockImplementation(() => {
      order.push('trackUserAction');
    });

    await trackUserActionAndLogChanges({
      logChanges,
      trackUserAction,
      activityEvents: [buildEvent()],
      logger,
    });

    expect(order).toEqual(['logChanges', 'trackUserAction']);
  });

  it('emits one user-activity entry per event', async () => {
    const trackUserAction = jest.fn();
    const events = [
      buildEvent(),
      buildEvent({ object: { id: 'rule-2', name: 'other', type: 'rule', tags: [] } }),
    ];

    await trackUserActionAndLogChanges({
      logChanges: jest.fn().mockResolvedValue(undefined),
      trackUserAction,
      activityEvents: events,
      logger,
    });

    expect(trackUserAction).toHaveBeenCalledTimes(2);
    expect(trackUserAction).toHaveBeenNthCalledWith(1, events[0]);
    expect(trackUserAction).toHaveBeenNthCalledWith(2, events[1]);
  });

  it('still emits user activity when the change-history write fails, and warns', async () => {
    const trackUserAction = jest.fn();

    await expect(
      trackUserActionAndLogChanges({
        logChanges: jest.fn().mockRejectedValue(new Error('history boom')),
        trackUserAction,
        activityEvents: [buildEvent()],
        logger,
      })
    ).resolves.toBeUndefined();

    expect(trackUserAction).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to log change history')
    );
  });

  it('swallows tracker errors per event and warns with the action id', async () => {
    const trackUserAction = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('activity boom');
      })
      .mockImplementationOnce(() => {});
    const events = [buildEvent(), buildEvent()];

    await expect(
      trackUserActionAndLogChanges({
        logChanges: jest.fn().mockResolvedValue(undefined),
        trackUserAction,
        activityEvents: events,
        logger,
      })
    ).resolves.toBeUndefined();

    expect(trackUserAction).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to track user action "alerting_rule_update"')
    );
  });

  it('only writes change history when no tracker is provided', async () => {
    const logChanges = jest.fn().mockResolvedValue(undefined);

    await trackUserActionAndLogChanges({
      logChanges,
      activityEvents: [buildEvent()],
      logger,
    });

    expect(logChanges).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
