/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuditLogger } from '@kbn/core-security-server';
import {
  AgentBuilderErrorCode,
  createAgentBuilderError,
  type SerializedAgentBuilderError,
} from '@kbn/agent-builder-common';
import { AgentBuilderAuditAction } from './audit_events';
import { AuditLogService } from './audit_log_service';

describe('AuditLogService', () => {
  const createService = ({
    auditLogger,
    asScopedThrows,
    logger = loggingSystemMock.createLogger(),
  }: {
    auditLogger?: Pick<AuditLogger, 'log'>;
    asScopedThrows?: Error;
    logger?: ReturnType<typeof loggingSystemMock.createLogger>;
  } = {}) => {
    const security = {
      audit: {
        asScoped: jest.fn(() => {
          if (asScopedThrows) throw asScopedThrows;
          return auditLogger ?? { log: jest.fn() };
        }),
      },
    } as unknown as SecurityServiceStart;

    return {
      security,
      logger,
      service: new AuditLogService({ logger, security }),
    };
  };

  it('logs agent create event', () => {
    const auditLogger = { log: jest.fn() };
    const { service } = createService({ auditLogger });
    const request = {} as KibanaRequest;

    service.logAgentCreated(request, { agentId: 'a-1', agentName: 'Agent One' });

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: AgentBuilderAuditAction.AGENT_CREATE }),
      })
    );
  });

  it('logs agent update event', () => {
    const auditLogger = { log: jest.fn() };
    const { service } = createService({ auditLogger });
    const request = {} as KibanaRequest;

    service.logAgentUpdated(request, { agentId: 'a-1' });

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: AgentBuilderAuditAction.AGENT_UPDATE }),
      })
    );
  });

  it('logs agent delete event', () => {
    const auditLogger = { log: jest.fn() };
    const { service } = createService({ auditLogger });
    const request = {} as KibanaRequest;

    service.logAgentDeleted(request, { agentId: 'a-1' });

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: AgentBuilderAuditAction.AGENT_DELETE }),
      })
    );
  });

  it('logs tool create event', () => {
    const auditLogger = { log: jest.fn() };
    const { service } = createService({ auditLogger });
    const request = {} as KibanaRequest;

    service.logToolCreated(request, { toolId: 't-1', toolType: 'esql' });

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: AgentBuilderAuditAction.TOOL_CREATE }),
      })
    );
  });

  it('logs tool update event', () => {
    const auditLogger = { log: jest.fn() };
    const { service } = createService({ auditLogger });
    const request = {} as KibanaRequest;

    service.logToolUpdated(request, { toolId: 't-1' });

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: AgentBuilderAuditAction.TOOL_UPDATE }),
      })
    );
  });

  it('logs tool delete event', () => {
    const auditLogger = { log: jest.fn() };
    const { service } = createService({ auditLogger });
    const request = {} as KibanaRequest;

    service.logToolDeleted(request, { toolId: 't-1' });

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: AgentBuilderAuditAction.TOOL_DELETE }),
      })
    );
  });

  it('swallows errors when audit logger throws', () => {
    const auditLogger = {
      log: jest.fn(() => {
        throw new Error('boom');
      }),
    };
    const { service } = createService({ auditLogger });
    const request = {} as KibanaRequest;

    expect(() => service.logToolCreated(request, { toolId: 't-1' })).not.toThrow();
  });

  it('swallows errors when audit scoping throws', () => {
    const { service } = createService({ asScopedThrows: new Error('nope') });
    const request = {} as KibanaRequest;

    expect(() => service.logToolCreated(request, { toolId: 't-1' })).not.toThrow();
  });

  it('logs debug when audit scoping throws', () => {
    const logger = loggingSystemMock.createLogger();
    const { service } = createService({ asScopedThrows: new Error('nope'), logger });
    const request = {} as KibanaRequest;

    service.logToolCreated(request, { toolId: 't-1' });

    expect(logger.debug).toHaveBeenCalled();
  });

  it('skips bulk tool events when skipped=true', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolCreatedSpy = jest.spyOn(service, 'logToolCreated').mockImplementation(() => {});

    service.logBulkToolEvents(request, AgentBuilderAuditAction.TOOL_CREATE, [
      { toolId: 't1', skipped: true },
      { toolId: 't2' },
    ]);

    expect(logToolCreatedSpy).toHaveBeenCalledTimes(1);
  });

  it('uses tool delete handler for bulk delete action', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolDeletedSpy = jest.spyOn(service, 'logToolDeleted').mockImplementation(() => {});

    service.logBulkToolEvents(request, AgentBuilderAuditAction.TOOL_DELETE, [{ toolId: 't1' }]);

    expect(logToolDeletedSpy).toHaveBeenCalledTimes(1);
  });

  it('maps bulk delete fulfilled true to success tool delete audit', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolDeletedSpy = jest.spyOn(service, 'logToolDeleted').mockImplementation(() => {});

    service.logBulkToolDeleteResults(request, {
      ids: ['t1'],
      deleteResults: [{ status: 'fulfilled', value: true }],
    });

    expect(logToolDeletedSpy).toHaveBeenCalledWith(request, { toolId: 't1' });
  });

  it('maps bulk delete fulfilled false to failure tool delete audit', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolDeletedSpy = jest.spyOn(service, 'logToolDeleted').mockImplementation(() => {});

    service.logBulkToolDeleteResults(request, {
      ids: ['t1'],
      deleteResults: [{ status: 'fulfilled', value: false }],
    });

    expect(logToolDeletedSpy).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        toolId: 't1',
        error: expect.objectContaining({ message: 'Tool delete returned false' }),
      })
    );
  });

  it('maps bulk delete rejected to failure tool delete audit', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolDeletedSpy = jest.spyOn(service, 'logToolDeleted').mockImplementation(() => {});

    service.logBulkToolDeleteResults(request, {
      ids: ['t1'],
      deleteResults: [{ status: 'rejected', reason: new Error('boom') }],
    });

    expect(logToolDeletedSpy).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        toolId: 't1',
        error: expect.objectContaining({ message: 'boom' }),
      })
    );
  });

  it('maps bulk create MCP success to tool create audit', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolCreatedSpy = jest.spyOn(service, 'logToolCreated').mockImplementation(() => {});

    service.logBulkCreateMcpToolResults(request, {
      results: [{ toolId: 'n.t1', mcpToolName: 't1', success: true }],
    });

    expect(logToolCreatedSpy).toHaveBeenCalledWith(request, { toolId: 'n.t1', toolType: 'mcp' });
  });

  it('does not log bulk create MCP skipped results', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolCreatedSpy = jest.spyOn(service, 'logToolCreated').mockImplementation(() => {});

    service.logBulkCreateMcpToolResults(request, {
      results: [{ toolId: 'n.t1', mcpToolName: 't1', success: true, skipped: true }],
    });

    expect(logToolCreatedSpy).not.toHaveBeenCalled();
  });

  it('maps bulk create MCP failure to tool create audit with serialized message', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolCreatedSpy = jest.spyOn(service, 'logToolCreated').mockImplementation(() => {});

    service.logBulkCreateMcpToolResults(request, {
      results: [
        {
          toolId: 'n.t1',
          mcpToolName: 't1',
          success: false,
          reason: createAgentBuilderError(AgentBuilderErrorCode.badRequest, 'bad').toJSON(),
        },
      ],
    });

    expect(logToolCreatedSpy).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        toolId: 'n.t1',
        toolType: 'mcp',
        error: expect.objectContaining({ message: 'bad' }),
      })
    );
  });

  it('maps bulk create MCP failure to tool create audit with unknown message fallback', () => {
    const { service } = createService();
    const request = {} as KibanaRequest;
    const logToolCreatedSpy = jest.spyOn(service, 'logToolCreated').mockImplementation(() => {});

    // This should be a SerializedAgentBuilderError, but we intentionally simulate a malformed
    // runtime payload to verify the fallback behavior.
    const malformedReason = { foo: 'bar' } as unknown as SerializedAgentBuilderError;

    service.logBulkCreateMcpToolResults(request, {
      results: [{ toolId: 'n.t1', mcpToolName: 't1', success: false, reason: malformedReason }],
    });

    expect(logToolCreatedSpy).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        toolId: 'n.t1',
        toolType: 'mcp',
        error: expect.objectContaining({ message: 'Unknown error' }),
      })
    );
  });
});
