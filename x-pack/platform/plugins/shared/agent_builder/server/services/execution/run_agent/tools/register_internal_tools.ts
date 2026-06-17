/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentExecutionMode,
  agentBuilderDefaultAgentId,
  ToolOrigin,
  type AgentCapabilities,
} from '@kbn/agent-builder-common';
import type { AgentHandlerContext } from '@kbn/agent-builder-server';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import { createSubagentTool } from './run_subagent';
import { createSleepTool } from './sleep';
import { createLoadSkillTool } from './load_skill';
import { createAskUserQuestionTool } from './ask_user_question';
import { builtinToolToExecutable } from '../utils/select_tools';
import type { BackgroundExecutionService } from '../background_execution_service';

export interface RegisterInternalToolsParams {
  context: AgentHandlerContext;
  agentId?: string;
  executionId?: string;
  capabilities?: AgentCapabilities;
  abortSignal?: AbortSignal;
  backgroundExecutionService: BackgroundExecutionService;
}

/**
 * Registers internal builtin tools (sub-agent, sleep, load_skill) into the
 * active ToolManager, gated by their respective experimental-features flags
 * and execution-mode constraints.
 */
export const registerInternalTools = async ({
  context,
  agentId,
  executionId,
  capabilities,
  abortSignal,
  backgroundExecutionService,
}: RegisterInternalToolsParams): Promise<void> => {
  const {
    toolManager,
    runner,
    logger,
    experimentalFeatures,
    executionMode,
    defaultConnectorId,
    subAgentExecutor,
    analyticsService,
    trackingService,
  } = context;

  // Sub-agent and sleep tools — experimental, and not available in standalone mode
  if (experimentalFeatures.subagents && executionMode !== AgentExecutionMode.standalone) {
    const subagentTool = createSubagentTool({
      agentId: agentId ?? agentBuilderDefaultAgentId,
      executionId: executionId ?? '',
      connectorId: defaultConnectorId,
      capabilities,
      subAgentExecutor,
      abortSignal,
      backgroundExecutionService,
    });
    const sleepTool = createSleepTool();
    await toolManager.addTools({
      type: ToolManagerToolType.executable,
      tools: [
        {
          ...builtinToolToExecutable({ tool: subagentTool, runner }),
          origin: ToolOrigin.internal,
        },
        {
          ...builtinToolToExecutable({ tool: sleepTool, runner }),
          origin: ToolOrigin.internal,
        },
      ],
      logger,
    });
  }

  // ask_user_question — experimental, and not available in standalone mode
  if (experimentalFeatures.askUserQuestion && executionMode !== AgentExecutionMode.standalone) {
    const askUserQuestionTool = createAskUserQuestionTool();
    await toolManager.addTools({
      type: ToolManagerToolType.executable,
      tools: [
        {
          ...builtinToolToExecutable({ tool: askUserQuestionTool, runner }),
          origin: ToolOrigin.internal,
        },
      ],
      logger,
    });
  }

  // load_skill — gated on the skills feature only.
  if (experimentalFeatures.skills) {
    const loadSkillTool = createLoadSkillTool({ analyticsService, trackingService });
    await toolManager.addTools({
      type: ToolManagerToolType.executable,
      tools: [
        {
          ...builtinToolToExecutable({ tool: loadSkillTool, runner }),
          origin: ToolOrigin.internal,
        },
      ],
      logger,
    });
  }
};
