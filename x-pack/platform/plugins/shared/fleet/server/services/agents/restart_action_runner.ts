/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';
import { appContextService } from '../app_context';

import { ActionRunner } from './action_runner';
import { createAgentAction } from './actions';
import { BulkActionTaskType } from './bulk_action_types';

export class RestartActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await restartBatch(this.esClient, agents, this.actionParams!);
  }

  protected getTaskType() {
    return BulkActionTaskType.RESTART_RETRY;
  }

  protected getActionType() {
    return 'RESTART';
  }
}

export async function restartBatch(
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  options: {
    actionId?: string;
    total?: number;
    spaceId?: string;
  }
): Promise<{ actionId: string }> {
  const now = new Date().toISOString();
  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? givenAgents.length;

  const agentIds = givenAgents.map((agent) => agent.id);
  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);

  await createAgentAction(esClient, soClient, {
    id: actionId,
    agents: agentIds,
    created_at: now,
    type: 'RESTART',
    total,
    namespaces,
  });

  return { actionId };
}
