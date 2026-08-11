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
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { ScopedRunner } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { createSubagentTool } from './run_subagent';
import { createSleepTool } from './sleep';
import { createLoadSkillTool } from './load_skill';
import { createSearchRelevantSkillsTool } from './search_relevant_skills';
import { createAskUserQuestionTool } from './ask_user_question';
import { createReadFileTool } from './read_file';
import { createListFilesTool } from './list_files';
import { createBashTool } from './bash';
import { createTodoTool } from '../../../tools/builtin/todo';
import { builtinToolToExecutable } from '../utils/select_tools';
import type { BackgroundExecutionService } from '../background_execution_service';

export interface RegisterInternalToolsParams {
  context: AgentHandlerContext;
  agentId?: string;
  executionId?: string;
  capabilities?: AgentCapabilities;
  abortSignal?: AbortSignal;
  backgroundExecutionService: BackgroundExecutionService;
  /** The agent's resolved skills, used by the `search_relevant_skills` tool. */
  filteredSkills: InternalSkillDefinition[];
  /**
   * Effective on/off for context-aware skill filtering (flag AND a dedicated fast model configured).
   * Gates registration of `search_relevant_skills` — not the raw `experimentalFeatures.relevantSkills`
   * flag, since the tool also relies on the fast model.
   */
  relevantSkillsEnabled: boolean;
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
  filteredSkills,
  relevantSkillsEnabled,
}: RegisterInternalToolsParams): Promise<void> => {
  const {
    toolManager,
    runner,
    logger,
    modelProvider,
    experimentalFeatures,
    executionMode,
    defaultConnectorId,
    subAgentExecutor,
    analyticsService,
    trackingService,
    filesystemService,
    bashService,
    todoStateManager,
  } = context;

  const interactive = executionMode !== AgentExecutionMode.standalone;

  const tools: Array<BuiltinToolDefinition<any>> = [];

  // Filesystem — read_file and list_files are always on; bash is FF-gated.
  tools.push(createReadFileTool({ filesystemService }));
  tools.push(createListFilesTool({ filesystemService }));
  if (experimentalFeatures.bash && bashService) {
    tools.push(createBashTool({ bashService }));
  }

  // Todos — FF-gated.
  if (experimentalFeatures.todos) {
    tools.push(createTodoTool({ todoStateManager }));
  }

  // Sub-agent + sleep — experimental, and not available in standalone mode.
  if (experimentalFeatures.subagents && interactive) {
    tools.push(
      createSubagentTool({
        agentId: agentId ?? agentBuilderDefaultAgentId,
        executionId: executionId ?? '',
        connectorId: defaultConnectorId,
        capabilities,
        subAgentExecutor,
        abortSignal,
        backgroundExecutionService,
      })
    );
    tools.push(createSleepTool());
  }

  // ask_user_question — not available in standalone mode.
  if (interactive) {
    tools.push(createAskUserQuestionTool());
  }

  // load_skill — gated on the skills feature only.
  if (experimentalFeatures.skills) {
    tools.push(createLoadSkillTool({ analyticsService, trackingService }));
  }

  // search_relevant_skills — context-aware skill discovery. Gated on the effective enablement
  // (flag AND a dedicated fast model), since the tool relies on the fast model too.
  if (relevantSkillsEnabled) {
    tools.push(
      createSearchRelevantSkillsTool({ modelProvider, filteredSkills, logger, abortSignal })
    );
  }

  await toolManager.addTools({
    type: ToolManagerToolType.executable,
    tools: tools.map((tool) => ({
      ...builtinToolToExecutable({ tool, runner: runner as ScopedRunner }),
      origin: ToolOrigin.internal,
    })),
    logger,
  });
};
