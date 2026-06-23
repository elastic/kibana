/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createOsqueryAuditEvent, logOsqueryAuditEvent, OsqueryAuditAction } from './audit';

describe('osquery audit', () => {
  describe('createOsqueryAuditEvent', () => {
    it('should build an ECS event with action, category and type', () => {
      const event = createOsqueryAuditEvent({ action: OsqueryAuditAction.FILE_BROWSE });

      expect(event.event).toEqual({
        action: OsqueryAuditAction.FILE_BROWSE,
        category: ['database'],
        type: ['access'],
        outcome: 'unknown',
      });
      expect(event.message).toBe('User browsed a directory via the Osquery Files tab');
    });

    it('should attach agent id and path as labels', () => {
      const event = createOsqueryAuditEvent({
        action: OsqueryAuditAction.FILE_BROWSE,
        agentId: 'agent-1',
        path: '/etc',
      });

      expect(event.labels).toEqual({ agent_id: 'agent-1', path: '/etc' });
    });

    it('should omit labels when neither agent id nor path are provided', () => {
      const event = createOsqueryAuditEvent({ action: OsqueryAuditAction.LIVE_QUERY });

      expect(event.labels).toBeUndefined();
    });

    it('should honor an explicit success outcome', () => {
      const event = createOsqueryAuditEvent({
        action: OsqueryAuditAction.LIVE_QUERY,
        outcome: 'success',
      });

      expect(event.event?.outcome).toBe('success');
    });

    it('should mark outcome failure and attach error details when an error is provided', () => {
      const event = createOsqueryAuditEvent({
        action: OsqueryAuditAction.FILE_RETRIEVE,
        outcome: 'success',
        error: new Error('boom'),
      });

      expect(event.event?.outcome).toBe('failure');
      expect(event.error).toEqual({ code: 'Error', message: 'boom' });
    });

    it('should allow overriding the message', () => {
      const event = createOsqueryAuditEvent({
        action: OsqueryAuditAction.LIVE_QUERY,
        message: 'custom',
      });

      expect(event.message).toBe('custom');
    });
  });

  describe('logOsqueryAuditEvent', () => {
    it('should log the built event through the provided audit logger', () => {
      const log = jest.fn();

      logOsqueryAuditEvent(
        { log, enabled: true, includeSavedObjectNames: false },
        {
          action: OsqueryAuditAction.FILE_BROWSE,
          agentId: 'agent-1',
          path: '/var/log',
          outcome: 'success',
        }
      );

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: OsqueryAuditAction.FILE_BROWSE,
            outcome: 'success',
          }),
          labels: { agent_id: 'agent-1', path: '/var/log' },
        })
      );
    });

    it('should be a no-op when no audit logger is available', () => {
      expect(() =>
        logOsqueryAuditEvent(undefined, { action: OsqueryAuditAction.LIVE_QUERY })
      ).not.toThrow();
    });
  });
});
