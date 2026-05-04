/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AfterToolCallHookContext, ToolProvider } from '@kbn/agent-builder-server';
import { filestoreTools } from '@kbn/agent-builder-common/tools';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import type { RunContext, SkillsService, ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { pickTools } from '../../services/execution/run_agent/utils/select_tools';
import { isSkillFileEntry } from '../../services/execution/runner/store/volumes/skills/utils';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import { classifySkill } from '../../telemetry/utils';

const MAX_SKILL_REGISTRY_TOOLS = 25;

export const createLoadSkillToolsAfterRead = ({
  analyticsService,
  trackingService,
}: { analyticsService?: AnalyticsService; trackingService?: TrackingService } = {}) => {
  return async (context: AfterToolCallHookContext): Promise<void> => {
    if (context.toolId !== filestoreTools.read) {
      return;
    }

    const { filestore, skills, toolProvider, toolManager, request, logger, runContext } =
      context.toolHandlerContext;

    const path = context.toolParams.path as string | undefined;
    if (!path) {
      return;
    }

    const entry = await filestore.read(path);
    if (!entry || !isSkillFileEntry(entry)) {
      return;
    }

    const { skill_id: skillId } = entry.metadata;

    await loadSkillTools({
      skillsService: skills,
      skillId,
      toolProvider,
      request,
      toolManager,
      logger,
      runContext,
      analyticsService,
      trackingService,
    });
  };
};

const loadSkillTools = async ({
  skillsService,
  skillId,
  toolProvider,
  request,
  toolManager,
  logger,
  runContext,
  analyticsService,
  trackingService,
}: {
  skillsService: SkillsService;
  skillId: string;
  toolProvider: ToolProvider;
  request: KibanaRequest;
  toolManager: ToolManager;
  logger: Logger;
  runContext: RunContext;
  analyticsService?: AnalyticsService;
  trackingService?: TrackingService;
}): Promise<void> => {
  const skill = await skillsService.get(skillId);
  if (!skill) {
    logger.warn(`Skill '${skillId}' not found in registry. Skipping tool loading.`);
    return;
  }

  const inlineTools = (await skill.getInlineTools?.()) ?? [];
  const inlineExecutableTools = inlineTools.map((tool) => skillsService.convertSkillTool(tool));

  const registryToolIds = await skill.getRegistryTools();
  if (registryToolIds.length > MAX_SKILL_REGISTRY_TOOLS) {
    throw new Error(
      `Skill '${skill.id}' returned ${registryToolIds.length} registry tools, exceeding the ${MAX_SKILL_REGISTRY_TOOLS}-tool limit.`
    );
  }
  const registryExecutableTools =
    registryToolIds.length > 0
      ? await pickTools({ toolProvider, selection: [{ tool_ids: registryToolIds }], request })
      : [];

  await toolManager.addTools(
    {
      type: ToolManagerToolType.executable,
      tools: [...inlineExecutableTools, ...registryExecutableTools],
      logger,
    },
    {
      dynamic: true,
    }
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
};
