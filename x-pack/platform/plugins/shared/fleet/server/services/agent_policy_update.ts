/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { AgentPolicy } from '../../common';

import { generateEnrollmentAPIKey, deleteEnrollmentApiKeyForAgentPolicyId } from './api_keys';
import { unenrollForAgentPolicyId } from './agents';
import { agentPolicyService } from './agent_policy';
import { appContextService } from './app_context';

export async function agentPolicyUpdateEventHandler(
  esClient: ElasticsearchClient,
  action: string,
  agentPolicyId: string,
  options?: { skipDeploy?: boolean; spaceId?: string; agentPolicy?: AgentPolicy | null }
) {
  // `soClient` from ingest `appContextService` is used to create policy change actions
  // to ensure encrypted SOs are handled correctly.
  // getInternalUserSOClientForSpaceId handles both cases: when spaceId is defined it scopes to
  // that space; when undefined it returns the client without the Spaces extension, which avoids
  // a spurious _has_privileges ES call on a context with no user credentials.
  const internalSoClient = appContextService.getInternalUserSOClientForSpaceId(options?.spaceId);

  if (action === 'created') {
    await generateEnrollmentAPIKey(internalSoClient, esClient, {
      name: 'Default',
      agentPolicyId,
      forceRecreate: true,
    });
    if (!options?.skipDeploy) {
      await agentPolicyService.deployPolicy(internalSoClient, agentPolicyId, options?.agentPolicy);
    }
  }

  if (action === 'updated') {
    await agentPolicyService.deployPolicy(internalSoClient, agentPolicyId, options?.agentPolicy);
  }

  if (action === 'deleted') {
    await unenrollForAgentPolicyId(internalSoClient, esClient, agentPolicyId);
    await deleteEnrollmentApiKeyForAgentPolicyId(esClient, agentPolicyId);
  }
}
