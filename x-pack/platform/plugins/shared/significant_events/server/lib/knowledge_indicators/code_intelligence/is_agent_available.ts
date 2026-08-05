/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { CODE_INTELLIGENCE_AGENT_ID } from './constants';

/**
 * Whether the code-intelligence agent (see {@link CODE_INTELLIGENCE_AGENT_ID},
 * today the externally-installed Sourcerer agent) is registered in Agent Builder.
 *
 * Code Intelligence is only useful when this agent — and the read-only code
 * tools/skills it carries — exist. The agent is installed independently
 * (`sourcerer setup`), not by this plugin, so extraction gates on its presence
 * and disables itself gracefully when it is absent. This mirrors the SCS
 * grounding path, which degrades to `undefined` when SCS tools are not installed.
 *
 * Returns `false` (never throws) so callers can treat any lookup failure as
 * "unavailable".
 */
export const isCodeIntelligenceAgentAvailable = async ({
  agentBuilder,
  request,
  logger,
}: {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<boolean> => {
  try {
    const registry = await agentBuilder.agents.getRegistry({ request });
    return await registry.has(CODE_INTELLIGENCE_AGENT_ID);
  } catch (error) {
    logger.warn(
      `code_intelligence: could not resolve agent "${CODE_INTELLIGENCE_AGENT_ID}" availability: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
};
