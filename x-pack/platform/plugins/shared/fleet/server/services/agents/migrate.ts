/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAgentAction } from './actions';

export async function migrateSingleAgent(esClient: any, agentId: string, options: any) {
  const response = await createAgentAction(esClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'MIGRATE',
    policyId: options.policyId,
    enrollment_token: options.enrollment_token,
    target_uri: options.uri,
    additionalSettings: options.settings,
  });
  return { actionId: response.id };
}
