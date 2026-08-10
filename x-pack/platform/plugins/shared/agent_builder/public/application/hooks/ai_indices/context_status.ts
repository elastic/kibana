/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common';
import { chatAgentTypeId } from '@kbn/agent-builder-common';

export type ContextStatus = 'on' | 'auto' | 'off';

type AgentShape = Pick<AgentDefinition, 'type' | 'configuration'>;

/**
 * Whether the agent's type merges the default `elastic` AI index in at runtime, meaning the agent
 * always retrieves from it regardless of what is stored on the agent itself.
 */
export const hasDefaultAiIndex = (agent: Pick<AgentDefinition, 'type'>): boolean =>
  agent.type === chatAgentTypeId;

/**
 * Derives how an agent uses the Context Engine.
 *
 * - `on`   — the agent has explicitly-configured AI indices.
 * - `auto` — nothing configured, but the agent's *type* contributes a default. The `chat` agent
 *            type registers `baseConfiguration: { ai_indices: [agentBuilderDefaultAiIndexId] }`,
 *            which is merged in at runtime, so these agents still retrieve from the Context
 *            Engine even though the GET response shows an empty list.
 * - `off`  — nothing configured and the type contributes no default, so the agent does not use
 *            the Context Engine at all.
 *
 * Note this assumes `chat` is the only agent type whose base configuration supplies AI indices.
 * The type registry is server-side and its base configurations are not exposed over HTTP, so the
 * browser cannot determine this in general. Agent types are allow-listed, and
 * `agent-builder-server/allow_lists.test.ts` pins that list so a new type fails a test and gets
 * reviewed against this derivation.
 */
export const getContextStatus = (agent: AgentShape): ContextStatus => {
  if ((agent.configuration.ai_indices?.length ?? 0) > 0) {
    return 'on';
  }
  return hasDefaultAiIndex(agent) ? 'auto' : 'off';
};
