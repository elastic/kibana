/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentCapabilities, ResolvedAgentCapabilities } from '@kbn/agent-builder-common';

export const getDefaultCapabilities = (): ResolvedAgentCapabilities => {
  return {
    visualizations: false,
  };
};

export const resolveCapabilities = (
  capabilities: AgentCapabilities | undefined
): ResolvedAgentCapabilities => {
  return {
    ...getDefaultCapabilities(),
    ...capabilities,
  };
};
