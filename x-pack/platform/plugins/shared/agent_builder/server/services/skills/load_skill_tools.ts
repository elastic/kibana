/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ToolOrigin } from '@kbn/agent-builder-common';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import type {
  AgentBuilderAnalytics,
  AgentBuilderTracking,
  ToolProvider,
} from '@kbn/agent-builder-server';
import type { RunContext, SkillsService, ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { pickTools } from '../execution/run_agent/utils/select_tools';
import { classifySkill } from '../../telemetry/utils';

export const MAX_SKILL_REGISTRY_TOOLS = 25;

export interface LoadSkillToolsParams {
  skill: InternalSkillDefinition;
  skillsService: SkillsService;
  toolProvider: ToolProvider;
  request: KibanaRequest;
  toolManager: ToolManager;
  logger: Logger;
  runContext: RunContext;
  analyticsService?: AgentBuilderAnalytics;
  trackingService?: AgentBuilderTracking;
}

/**
 * Loads a skill's inline + registry tools into the active ToolManager and
 * emits SkillInvoked telemetry. Used by both the load_skill builtin tool and
 * the legacy load_skill_tools_after_read hook.
 *
 * Returns the ids of the tools that were registered (inline first, then
 * registry). Throws if the skill exceeds MAX_SKILL_REGISTRY_TOOLS registry tools.
 */
export const loadSkillTools = async ({
  skill,
  skillsService,
  toolProvider,
  request,
  toolManager,
  logger,
  runContext,
  analyticsService,
  trackingService,
}: LoadSkillToolsParams): Promise<string[]> => {
  const inlineTools = (await skill.getInlineTools?.()) ?? [];
  const inlineExecutableTools = inlineTools.map((tool) => ({
    ...skillsService.convertSkillTool(tool),
    origin: ToolOrigin.inline,
  }));

  const registryToolIds = await skill.getRegistryTools();
  if (registryToolIds.length > MAX_SKILL_REGISTRY_TOOLS) {
    throw new Error(
      `Skill '${skill.id}' returned ${registryToolIds.length} registry tools, exceeding the ${MAX_SKILL_REGISTRY_TOOLS}-tool limit.`
    );
  }
  const registryExecutableTools =
    registryToolIds.length > 0
      ? (
          await pickTools({
            toolProvider,
            selection: [{ tool_ids: registryToolIds }],
            request,
          })
        ).map((tool) => ({ ...tool, origin: ToolOrigin.registry }))
      : [];

  await toolManager.addTools(
    {
      type: ToolManagerToolType.executable,
      tools: [...inlineExecutableTools, ...registryExecutableTools],
      logger,
    },
    { dynamic: true }
  );

  try {
    const agentContext = getAgentFromRunContext(runContext);
    const { origin, solution_area: solutionArea } = classifySkill(skill);
    analyticsService?.reportSkillInvoked({
      skillId: skill.id,
      origin,
      solutionArea,
      pluginId: skill.plugin_id,
      agentId: agentContext?.agentId,
      conversationId: agentContext?.conversationId,
      executionId: agentContext?.executionId,
      toolCount: inlineExecutableTools.length + registryExecutableTools.length,
    });
    trackingService?.trackSkillInvocation(origin);
  } catch (e) {
    logger.warn(`Failed to report SkillInvoked telemetry: ${e}`);
  }

  return [...inlineExecutableTools.map((t) => t.id), ...registryExecutableTools.map((t) => t.id)];
};
