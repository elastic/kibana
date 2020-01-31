/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { Agent, AgentAction } from '../../repositories/agents/types';
// import { AgentPolicy } from '../../repositories/policies/types';
import { AgentEvent } from '../../../common/types/domain_data';
import { FleetServerLib } from '../types';

export async function agentCheckin(
  libs: FleetServerLib,
  user: FrameworkUser,
  agent: Agent,
  events: AgentEvent[],
  localMetadata?: any
) {
  const internalUser = libs.framework.getInternalUser();
  const updateData: Partial<Agent> = {
    last_checkin: new Date().toISOString(),
  };

  const actions = filterActionsForCheckin(agent);

  // Generate new agent config if config is updated
  if (isNewAgentConfig(agent) && agent.policy_id) {
    const policy = await libs.policies.getFullPolicy(internalUser, agent.policy_id);
    if (policy) {
      // Assign output API keys
      // We currently only support default ouput
      if (!agent.default_api_key) {
        updateData.default_api_key = await libs.apiKeys.generateOutputApiKey('default', agent.id);
      }
      // Mutate the policy to set the api token for this agent
      policy.outputs.default.api_token = agent.default_api_key || updateData.default_api_key;

      const policyChangeAction: AgentAction = {
        id: uuid.v4(),
        type: 'POLICY_CHANGE',
        created_at: new Date().toISOString(),
        data: JSON.stringify({
          policy,
        }),
      };
      actions.push(policyChangeAction);
      // persist new action
      updateData.actions = actions;
    }
  }
  if (localMetadata) {
    updateData.local_metadata = localMetadata;
  }

  const { updatedErrorEvents } = await libs.agentEvents.processEventsForCheckin(
    internalUser,
    agent,
    events
  );

  // Persist changes
  if (updatedErrorEvents) {
    updateData.current_error_events = updatedErrorEvents;
  }

  await libs.agentsRepository.update(internalUser, agent.id, updateData);

  return { actions };
}

function isNewAgentConfig(agent: Agent) {
  const isFirstCheckin = !agent.last_checkin;
  const isConfigUpdatedSinceLastCheckin =
    agent.last_checkin && agent.config_updated_at && agent.last_checkin <= agent.config_updated_at;

  return isFirstCheckin || isConfigUpdatedSinceLastCheckin;
}

function filterActionsForCheckin(agent: Agent): AgentAction[] {
  return agent.actions.filter((a: AgentAction) => !a.sent_at);
}
