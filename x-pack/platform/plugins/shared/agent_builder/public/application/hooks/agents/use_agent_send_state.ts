/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiPrivileges } from '../use_ui_privileges';
import { useAgentBuilderAgentById } from './use_agent_by_id';
import { useAgentBuilderAgents } from './use_agents';
import { useAgentModel } from './use_agent_model';
import { useValidateAgentId } from './use_validate_agent_id';

/**
 * Whether messages can be sent to an agent, in the pieces the message input needs to explain why
 * not, and the agent itself once it is found. The input and the conversation starters share it, so
 * both follow the same rules and look the agent up once.
 */
export const useAgentSendState = (agentId: string | undefined) => {
  const { isFetched } = useAgentBuilderAgents();
  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);
  const { isLoading: isAgentModelLoading } = useAgentModel(agentId);

  const { agent: agentById, isLoading: isLoadingAgentById } = useAgentBuilderAgentById(
    !isAgentIdValid && isFetched && Boolean(agentId) ? agentId : undefined
  );
  const agentExists = isAgentIdValid || Boolean(agentById);

  // An agent bound to a service account can only be invoked with the dedicated privilege; the
  // server refuses the request, so the composer says why up front instead of failing on send.
  const { invokeBoundAgents } = useUiPrivileges();
  const { agent: currentAgent } = useAgentBuilderAgentById(isAgentIdValid ? agentId : undefined);
  const isBoundAgentForbidden = Boolean(currentAgent?.service_account_id) && !invokeBoundAgents;

  const isAgentDeleted = !agentExists && !isLoadingAgentById && isFetched && Boolean(agentId);

  const agent = currentAgent ?? agentById ?? undefined;

  return { agent, agentExists, isAgentDeleted, isBoundAgentForbidden, isAgentModelLoading };
};
