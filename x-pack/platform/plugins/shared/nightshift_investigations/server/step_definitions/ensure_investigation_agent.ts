/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { installInvestigationAgent } from '../lib/install_investigation_agent';

/**
 * `agents.ensure` guarantees the agent document exists, not that it is searchable, and the
 * lookup on the read side is a space-filtered search rather than a realtime get. Callers that
 * schedule the workflow through Task Manager get seconds of slack for free; two adjacent steps
 * in one execution do not, so the visibility has to be waited on explicitly. Matches the retry
 * agent_builder itself uses when it installs the default agent just-in-time.
 */
const VISIBILITY_RETRY_OPTIONS = { retries: 9, factor: 1, minTimeout: 300 } as const;

export const ensureInvestigationAgentStepDefinition = (
  getAgentBuilder: () => AgentBuilderPluginStart | undefined
) =>
  createServerStepDefinition({
    id: 'nightshift.ensureInvestigationAgent',
    label: 'Ensure Nightshift Investigation Agent',
    category: StepCategory.Ai,
    description:
      'Installs the investigation agent in the space this workflow runs in, so any caller can start an investigation without installing it first. Idempotent: an existing agent is left untouched.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      space_id: z.string().describe('The space the investigation agent was ensured in'),
    }),
    handler: async (context) => {
      const agentBuilder = getAgentBuilder();
      if (!agentBuilder) {
        throw new Error('agentBuilder is not available, cannot install the investigation agent');
      }

      const { spaceId } = context.contextManager.getContext().workflow;

      await installInvestigationAgent({ agentBuilder, spaceId });

      // Resolved through the fake request rather than `spaceId` on purpose: this is the space the
      // downstream `ai.agent` step resolves agents in, so a divergence between the two fails here
      // with a clear message instead of surfacing as a missing agent later.
      const registry = await agentBuilder.agents.getRegistry({
        request: context.contextManager.getFakeRequest(),
      });

      await pRetry(async () => {
        if (!(await registry.has(SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID))) {
          throw new Error(
            `Investigation agent "${SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID}" is not resolvable in space "${spaceId}" yet`
          );
        }
      }, VISIBILITY_RETRY_OPTIONS);

      return { output: { space_id: spaceId } };
    },
  });
