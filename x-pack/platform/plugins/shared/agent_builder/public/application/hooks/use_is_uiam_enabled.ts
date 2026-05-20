/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAgentBuilderServices } from './use_agent_builder_service';

export const useIsUIAMEnabled = (): boolean => {
  const { startDependencies } = useAgentBuilderServices();
  return startDependencies.security?.authc.isUIAMEnabled() ?? false;
};
