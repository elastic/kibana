/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { omit } from 'lodash';

import type { Agent } from '../../types';

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';

import { createAgentAction, createErrorActionResults } from './actions';

export class ChangePrivilegeActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await changePrivilegeAgentsBatch(
      this.esClient,
      this.soClient,
      agents,
      this.actionParams!
    );
  }

  protected getTaskType() {
    return BulkActionTaskType.MIGRATE_RETRY;
  }

  protected getActionType() {
    return 'MIGRATE';
  }
}

export async function changePrivilegeAgentsBatch(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agents: Agent[],
  options: {
    actionId?: string;
    total?: number;
    user_info?: {
      username?: string;
      groupname?: string;
      password?: string;
    };
  }
) {
  const errors: Record<Agent['id'], Error> = {};
  const now = new Date().toISOString();

  const agentsToAction: Agent[] = [];

  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? agents.length;
  const agentIds = agentsToAction.map((agent) => agent.id);

  // Extract password from options if provided and pass it as a secret.
  const res = await createAgentAction(esClient, soClient, {
    id: actionId,
    agents: agentIds,
    created_at: now,
    type: 'PRIVILEGE_LEVEL_CHANGE',
    total,
    data: {
      unprivileged: true,
      ...(options?.user_info && { user_info: omit(options?.user_info, ['password']) }),
    },
    ...(options?.user_info?.password && {
      secrets: { user_info: { password: options.user_info.password } },
    }),
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'agent does not support migration action'
  );

  return { actionId: res.id };
}
