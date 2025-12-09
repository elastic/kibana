/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AgentBuilderStartDependencies } from '../../types';
import type { AgentBuilderPluginStart } from '../../types';

const LazyAgentBuilderNavControlWithProvider = dynamic(() =>
  import('./agent_builder_nav_control_with_provider').then((m) => ({
    default: m.AgentBuilderNavControlWithProvider,
  }))
);

interface AgentBuilderNavControlInitiatorProps {
  coreStart: CoreStart;
  pluginsStart: AgentBuilderStartDependencies;
  agentBuilderService: AgentBuilderPluginStart;
}

export const AgentBuilderNavControlInitiator = ({
  coreStart,
  pluginsStart,
  agentBuilderService,
}: AgentBuilderNavControlInitiatorProps) => {
  return (
    <LazyAgentBuilderNavControlWithProvider
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      agentBuilderService={agentBuilderService}
    />
  );
};
