/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEvent } from '@kbn/event-log-plugin/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { createEventLogService } from './event_log_service.mock';

describe('EventLogService', () => {
  describe('logEvent', () => {
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

  describe('findActionPolicyExecutionEvents', () => {
    const buildResult = (
      overrides: Partial<{ data: unknown[]; page: number; per_page: number; total: number }> = {}
    ) => ({
      data: [],
      page: 1,
      per_page: 50,
      total: 0,
      ...overrides,
    });

    it('uses the request-scoped event log client', async () => {
      const { eventLogService, mockEventLogClient, mockClientService } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue(buildResult() as any);
      const request = httpServerMock.createKibanaRequest();

      await eventLogService.findActionPolicyExecutionEvents({ request });

      expect(mockClientService.getClient).toHaveBeenCalledWith(request);
    });

    it('queries findEventsWithAuthFilter with the policy SO type and an empty ids array', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue(buildResult() as any);
      const request = httpServerMock.createKibanaRequest();

      await eventLogService.findActionPolicyExecutionEvents({ request });

      const [type, ids] = mockEventLogClient.findEventsWithAuthFilter.mock.calls[0];
      expect(type).toBe(ACTION_POLICY_SAVED_OBJECT_TYPE);
      expect(ids).toEqual([]);
    });

    it('passes the dispatched/throttled provider filter as the auth filter', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue(buildResult() as any);
      const request = httpServerMock.createKibanaRequest();

      await eventLogService.findActionPolicyExecutionEvents({ request });

      const authFilter = mockEventLogClient.findEventsWithAuthFilter.mock.calls[0][2];
      expect(authFilter).toMatchObject({ type: 'function', function: 'and' });
    });

    it('forwards page and perPage to per_page in options, sorted by @timestamp desc', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue(
        buildResult({ page: 3, per_page: 25 }) as any
      );
      const request = httpServerMock.createKibanaRequest();

      await eventLogService.findActionPolicyExecutionEvents({ request, page: 3, perPage: 25 });

      const options = mockEventLogClient.findEventsWithAuthFilter.mock.calls[0][4];
      expect(options).toEqual(
        expect.objectContaining({
          page: 3,
          per_page: 25,
          sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        })
      );
    });

    it('applies default page=1 and perPage=50 when not provided', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue(buildResult() as any);
      const request = httpServerMock.createKibanaRequest();

      await eventLogService.findActionPolicyExecutionEvents({ request });

      const options = mockEventLogClient.findEventsWithAuthFilter.mock.calls[0][4];
      expect(options).toEqual(
        expect.objectContaining({
          page: 1,
          per_page: 50,
        })
      );
    });

    it('passes start when startDate is provided and omits it otherwise', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue(buildResult() as any);
      const request = httpServerMock.createKibanaRequest();

      await eventLogService.findActionPolicyExecutionEvents({
        request,
        startDate: '2026-05-04T00:00:00Z',
      });
      const withStart = mockEventLogClient.findEventsWithAuthFilter.mock.calls[0][4];
      expect(withStart).toEqual(expect.objectContaining({ start: '2026-05-04T00:00:00Z' }));

      mockEventLogClient.findEventsWithAuthFilter.mockClear();
      await eventLogService.findActionPolicyExecutionEvents({ request });
      const withoutStart = mockEventLogClient.findEventsWithAuthFilter.mock.calls[0][4];
      expect(withoutStart).not.toHaveProperty('start');
    });

    it('passes namespace as undefined so the client resolves it from the request', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue(buildResult() as any);
      const request = httpServerMock.createKibanaRequest();

      await eventLogService.findActionPolicyExecutionEvents({ request });

      const namespace = mockEventLogClient.findEventsWithAuthFilter.mock.calls[0][3];
      expect(namespace).toBeUndefined();
    });

    it('maps the client result to the contract shape', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      const fakeEvents = [{ '@timestamp': '2026-05-05T10:00:00Z' }];
      mockEventLogClient.findEventsWithAuthFilter.mockResolvedValue({
        data: fakeEvents,
        page: 2,
        per_page: 25,
        total: 137,
      } as any);
      const request = httpServerMock.createKibanaRequest();

      const result = await eventLogService.findActionPolicyExecutionEvents({
        request,
        page: 2,
        perPage: 25,
      });

      expect(result).toEqual({
        events: fakeEvents,
        page: 2,
        perPage: 25,
        total: 137,
      });
    });

    it('propagates errors from the underlying client', async () => {
      const { eventLogService, mockEventLogClient } = createEventLogService();
      mockEventLogClient.findEventsWithAuthFilter.mockRejectedValue(new Error('boom'));
      const request = httpServerMock.createKibanaRequest();

      await expect(eventLogService.findActionPolicyExecutionEvents({ request })).rejects.toThrow(
        'boom'
      );
    });
  });
});
