/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type { AuditEvent } from '@kbn/security-plugin/server';
import type { BulkCreateMcpToolsResponse } from '../../common/http_api/tools';
import { asError } from '../utils/as_error';
import {
  AgentBuilderAuditAction,
  agentAuditEvent,
  toolAuditEvent,
  type AgentAuditEventParams,
  type ToolAuditEventParams,
} from './audit_events';
import { getSerializedErrorMessage } from './helpers';

interface AuditLogServiceDeps {
  security: SecurityServiceStart;
  logger: Logger;
}

export interface BulkToolAuditEvent {
  toolId: string;
  toolType?: string;
  /**
   * When true, indicates the operation was intentionally skipped (e.g. bulk create with
   * `skip_existing: true`). Skipped events should not be logged.
   */
  skipped?: boolean;
  /**
   * When set, the audit event will be logged as a failure.
   */
  error?: Error;
}

export class AuditLogService {
  constructor(private readonly deps: AuditLogServiceDeps) {}

  private log(request: KibanaRequest, event: AuditEvent): void {
    try {
      const auditLogger = this.deps.security.audit.asScoped(request);
      auditLogger.log(event);
    } catch (error) {
      // Best-effort: do not fail requests if audit logging fails
      this.deps.logger.debug('Failed to write Agent Builder audit log event', {
        error: asError(error),
      });
    }
  }

  logAgentCreated(request: KibanaRequest, params: Omit<AgentAuditEventParams, 'action'>): void {
    this.log(
      request,
      agentAuditEvent({
        ...params,
        action: AgentBuilderAuditAction.AGENT_CREATE,
      })
    );
  }

  logAgentUpdated(request: KibanaRequest, params: Omit<AgentAuditEventParams, 'action'>): void {
    this.log(
      request,
      agentAuditEvent({
        ...params,
        action: AgentBuilderAuditAction.AGENT_UPDATE,
      })
    );
  }

  logAgentDeleted(request: KibanaRequest, params: Omit<AgentAuditEventParams, 'action'>): void {
    this.log(
      request,
      agentAuditEvent({
        ...params,
        action: AgentBuilderAuditAction.AGENT_DELETE,
      })
    );
  }

  logToolCreated(request: KibanaRequest, params: Omit<ToolAuditEventParams, 'action'>): void {
    this.log(
      request,
      toolAuditEvent({
        ...params,
        action: AgentBuilderAuditAction.TOOL_CREATE,
      })
    );
  }

  logToolUpdated(request: KibanaRequest, params: Omit<ToolAuditEventParams, 'action'>): void {
    this.log(
      request,
      toolAuditEvent({
        ...params,
        action: AgentBuilderAuditAction.TOOL_UPDATE,
      })
    );
  }

  logToolDeleted(request: KibanaRequest, params: Omit<ToolAuditEventParams, 'action'>): void {
    this.log(
      request,
      toolAuditEvent({
        ...params,
        action: AgentBuilderAuditAction.TOOL_DELETE,
      })
    );
  }

  /**
   * Bulk helper to log tool create/delete events.
   *
   * The audit event outcome is derived from presence of `error`.
   */
  logBulkToolEvents(
    request: KibanaRequest,
    action: AgentBuilderAuditAction.TOOL_CREATE | AgentBuilderAuditAction.TOOL_DELETE,
    events: BulkToolAuditEvent[]
  ): void {
    for (const event of events) {
      if (event.skipped) continue;

      if (action === AgentBuilderAuditAction.TOOL_CREATE) {
        this.logToolCreated(request, {
          toolId: event.toolId,
          toolType: event.toolType,
          error: event.error,
        });
      } else {
        this.logToolDeleted(request, {
          toolId: event.toolId,
          toolType: event.toolType,
          error: event.error,
        });
      }
    }
  }

  /**
   * Bulk helper used by internal bulk delete endpoints.
   */
  logBulkToolDeleteResults(
    request: KibanaRequest,
    params: { ids: string[]; deleteResults: Array<PromiseSettledResult<boolean>> }
  ): void {
    const { ids, deleteResults } = params;
    this.logBulkToolEvents(
      request,
      AgentBuilderAuditAction.TOOL_DELETE,
      deleteResults.map((settled, index) => {
        const toolId = ids[index];
        if (settled.status === 'fulfilled' && settled.value) {
          return { toolId };
        }
        return {
          toolId,
          error:
            settled.status === 'rejected'
              ? asError(settled.reason)
              : new Error('Tool delete returned false'),
        };
      })
    );
  }

  /**
   * Bulk helper used by internal MCP import endpoints.
   */
  logBulkCreateMcpToolResults(
    request: KibanaRequest,
    params: { results: BulkCreateMcpToolsResponse['results'] }
  ): void {
    const { results } = params;
    this.logBulkToolEvents(
      request,
      AgentBuilderAuditAction.TOOL_CREATE,
      results.map((result) => {
        if (!result.success) {
          const reasonMessage = getSerializedErrorMessage(result.reason) ?? 'Unknown error';
          return {
            toolId: result.toolId,
            toolType: 'mcp',
            error: new Error(reasonMessage),
          };
        }
        if ('skipped' in result && result.skipped) {
          return {
            toolId: result.toolId,
            toolType: 'mcp',
            skipped: true,
          };
        }
        return {
          toolId: result.toolId,
          toolType: 'mcp',
        };
      })
    );
  }
}
