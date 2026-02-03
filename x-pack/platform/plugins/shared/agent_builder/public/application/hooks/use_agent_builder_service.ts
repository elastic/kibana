/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { AgentBuilderServicesContext } from '../context/agent_builder_services_context';

export const useAgentBuilderServices = () => {
  const services = useContext(AgentBuilderServicesContext);
  if (services === undefined) {
    throw new Error(
      `AgentBuilderServicesContext not set. Did you wrap your component in <AgentBuilderServicesContext.Provider> ?`
    );
  }
  return services;
};
