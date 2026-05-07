/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEvent } from '@kbn/event-log-plugin/server';
import { createEventLogService } from './event_log_service.mock';

describe('EventLogService', () => {
  it('delegates logEvent to the underlying IEventLogger', () => {
    const { eventLogService, mockEventLogger } = createEventLogService();
    const event: IEvent = {
      '@timestamp': '2026-04-29T12:00:00.000Z',
      event: { action: 'test', outcome: 'success' },
    };

    eventLogService.logEvent(event);

    expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockEventLogger.logEvent).toHaveBeenCalledWith(event, undefined);
  });

  it('forwards the optional id argument to the underlying IEventLogger', () => {
    const { eventLogService, mockEventLogger } = createEventLogService();
    const event: IEvent = {
      '@timestamp': '2026-04-29T12:00:00.000Z',
      event: { action: 'test', outcome: 'success' },
    };

    eventLogService.logEvent(event, 'event-id-1');

    expect(mockEventLogger.logEvent).toHaveBeenCalledWith(event, 'event-id-1');
  });
});
