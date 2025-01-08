/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { RequestDiagnosticsAdditionalMetrics } from '../../../common/types';
import { isAgentRequestDiagnosticsSupported } from '../../../common/services';
import type { Agent } from '../../types';
import { REQUEST_DIAGNOSTICS_TIMEOUT_MS } from '../../constants';
import { FleetError } from '../../errors';

import { ActionRunner } from './action_runner';
import { createAgentAction, createErrorActionResults } from './actions';
import { BulkActionTaskType } from './bulk_action_types';

export class RequestDiagnosticsActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await requestDiagnosticsBatch(this.esClient, agents, this.actionParams!);
  }

  protected getTaskType() {
    return BulkActionTaskType.REQUEST_DIAGNOSTICS_RETRY;
  }

  protected getActionType() {
    return 'REQUEST_DIAGNOSTICS';
  }
}

export async function requestDiagnosticsBatch(
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  options: {
    actionId?: string;
    total?: number;
    additionalMetrics?: RequestDiagnosticsAdditionalMetrics[];
    spaceId?: string;
  }
): Promise<{ actionId: string }> {
  const errors: Record<Agent['id'], Error> = {};
  const now = new Date().toISOString();

  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? givenAgents.length;

  givenAgents.forEach((agent: Agent) => {
    if (!isAgentRequestDiagnosticsSupported(agent)) {
      errors[agent.id] = new FleetError(
        `Agent ${agent.id} does not support request diagnostics action.`
      );
    }
  });

  const agentIds = givenAgents.map((agent) => agent.id);
  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];

  await createAgentAction(esClient, {
    id: actionId,
    agents: agentIds,
    created_at: now,
    type: 'REQUEST_DIAGNOSTICS',
    expiration: new Date(Date.now() + REQUEST_DIAGNOSTICS_TIMEOUT_MS).toISOString(),
    total,
    data: {
      additional_metrics: options.additionalMetrics,
    },
    namespaces,
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'agent does not support request diagnostics action'
  );

  return {
    actionId,
  };
}
