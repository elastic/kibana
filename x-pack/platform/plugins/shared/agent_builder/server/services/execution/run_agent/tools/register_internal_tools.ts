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
import { createSubagentTool } from './run_subagent';
import { createOpencodeSubagentTool } from './run_opencode_subagent';
import { createListSandboxCliConnectorsTool } from './list_sandbox_cli_connectors';
import { getOpencodeSubagentExecutor } from '../../opencode_subagent';
import { resolveProfileWithSecrets } from '../../../sandboxes';
import { createSleepTool } from './sleep';
import { createLoadSkillTool } from './load_skill';
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
  /**
   * Sandbox Profile attached to the agent (from its configuration). When set (and
   * the coding sub-agent capability is enabled), the agent gets the OpenCode
   * coding sub-agent running in that profile's sandbox. When absent, the agent
   * has no coding sub-agent — it behaves as a normal Agent Builder agent.
   */
  sandboxProfileId?: string;
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
  sandboxProfileId,
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
    filesystemService,
    bashService,
    todoStateManager,
    spaceId,
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

  // OpenCode coding sub-agent — experimental, per-agent, not in standalone mode.
  //
  // Gating is now PER AGENT: the tool is only registered when the capability is
  // enabled AND this agent has a resolvable Sandbox Profile attached. An agent
  // with no profile behaves as a normal Agent Builder agent (no coding sub-agent),
  // even if the capability flag is globally on. The resolved profile (with
  // secrets) is bound to the tool so the run uses the agent's own sandbox.
  if (experimentalFeatures.opencodeSubagent && interactive && sandboxProfileId) {
    const opencodeExecutor = getOpencodeSubagentExecutor();
    if (!opencodeExecutor) {
      logger.warn(
        'opencodeSubagent feature is enabled but the executor is not initialized; skipping run_opencode_subagent tool'
      );
    } else {
      try {
        const profile = await resolveProfileWithSecrets(sandboxProfileId, { namespace: spaceId });
        if (profile) {
          // The executor mints a per-run, privilege-scoped API key (on behalf of
          // the requesting user) for the sandbox's MCP loopback, so no static
          // credential is threaded here. See McpAuthMinter.
          tools.push(createListSandboxCliConnectorsTool({ executor: opencodeExecutor }));
          tools.push(createOpencodeSubagentTool({ executor: opencodeExecutor, profile }));
        } else {
          logger.warn(
            `Agent ${
              agentId ?? 'unknown'
            } references sandbox profile ${sandboxProfileId} which was not found; skipping coding sub-agent`
          );
        }
      } catch (e) {
        logger.warn(
          `Failed to resolve sandbox profile ${sandboxProfileId} for agent ${
            agentId ?? 'unknown'
          }: ${(e as Error).message}`
        );
      }
    }
  }

  // ask_user_question — not available in standalone mode.
  if (interactive) {
    tools.push(createAskUserQuestionTool());
  }

  // load_skill — gated on the skills feature only.
  if (experimentalFeatures.skills) {
    tools.push(createLoadSkillTool({ analyticsService, trackingService }));
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
