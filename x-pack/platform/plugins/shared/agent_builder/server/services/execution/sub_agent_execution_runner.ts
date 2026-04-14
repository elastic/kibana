/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isAgentBuilderError, createInternalError } from '@kbn/agent-builder-common';
import { executeAgent$, resolveServices, handleCancellation } from './utils';
import type { AgentExecutionDeps } from './execution_runner';
import type { AgentExecution, SubAgentExecutionParams } from './types';

/**
 * Handles execution of a sub-agent. Unlike {@link handleAgentExecution}, this
 * is a conversation-less flow: no conversation resolution, no title generation,
 * no persistence events, and no metering/telemetry.
 */
export const handleSubAgentExecution = async ({
  execution,
  deps,
  request,
  abortSignal,
}: {
  execution: AgentExecution;
  deps: AgentExecutionDeps;
  request: KibanaRequest;
  abortSignal: AbortSignal;
}): Promise<Observable<ChatEvent>> => {
  const subAgentParams = execution.agentParams as SubAgentExecutionParams;
  const agentId = execution.agentId;
  const { logger, runAgent } = deps;

  const { selectedConnectorId } = await resolveServices({
    agentId,
    connectorId: subAgentParams.connectorId,
    request,
    ...deps,
  });

  const agentEvents$ = executeAgent$({
    agentId,
    executionId: execution.executionId,
    request,
    nextInput: { message: subAgentParams.prompt },
    capabilities: subAgentParams.capabilities,
    abortSignal,
    conversation: undefined,
    defaultConnectorId: selectedConnectorId,
    runAgent,
    executionMode: 'subagent',
  });

  return agentEvents$.pipe(
    handleCancellation(abortSignal),
    catchError((err) => {
      logger.error(`Error executing sub-agent: ${err.stack ?? err.message}`);
      return throwError(() => {
        if (isAgentBuilderError(err)) {
          return err;
        }
        return createInternalError(`Error executing sub-agent: ${err.message}`, {
          statusCode: 500,
        });
      });
    })
  );
};
