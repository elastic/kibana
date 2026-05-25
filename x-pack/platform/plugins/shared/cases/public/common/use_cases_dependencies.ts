/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { useKibana } from './lib/kibana';

export interface CasesDependencies {
  agentBuilder?: AgentBuilderPluginStart;
}

export const useCasesDependencies = (): CasesDependencies => {
  const { services } = useKibana();

  return useMemo(
    () => ({
      agentBuilder: services.agentBuilder as AgentBuilderPluginStart | undefined,
    }),
    [services.agentBuilder]
  );
};
