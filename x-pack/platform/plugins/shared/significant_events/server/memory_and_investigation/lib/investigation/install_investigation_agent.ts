/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
} from '../../agents/investigation';

export const installInvestigationAgent = async ({
  agentBuilder,
  request,
  logger,
}: {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<void> => {
  const registry = await agentBuilder.agents.getRegistry({ request });

  if (await registry.has(SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID)) {
    const existingAgent = await registry.get(SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID);
    if (existingAgent.type !== SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID) {
      logger.error(
        `Cannot install investigation agent "${SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID}": ` +
          `the id is already used by an agent of type "${existingAgent.type}"`
      );
    }
    return;
  }

  try {
    await registry.create({
      id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
      type: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
      name: 'Streams Investigator',
      description:
        'Investigates an observability issue by querying available signals (logs, traces, metrics), ' +
        'reasoning about causality direction, and producing a contributing-factors conclusion with supporting evidence.',
      labels: ['observability', 'streams', 'significant-events', 'investigation', 'root-cause'],
      avatar_symbol: 'SI',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    });
  } catch (error) {
    // Multiple Kibana nodes may attempt the create concurrently. If another node won,
    // the desired end state already exists and this installation is complete.
    if (await registry.has(SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID)) {
      return;
    }
    throw error;
  }
};
