/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAgentBuilderAgentById } from './use_agent_by_id';

export const useIsAgentReadOnly = (agentId?: string) => {
  const { agent } = useAgentBuilderAgentById(agentId);
  return !!agent?.readonly;
};
