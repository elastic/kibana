/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { AgentHandlerContext } from '@kbn/agent-builder-server';
import { resolveAllowedSubagents } from '../../../agents/utils/resolve_allowed_subagents';
import { registerInternalTools, type RegisterInternalToolsParams } from './register_internal_tools';
import { createSubagentTool } from './run_subagent';

jest.mock('../../../agents/utils/resolve_allowed_subagents', () => ({
  resolveAllowedSubagents: jest.fn(),
}));
jest.mock('../utils/select_tools', () => ({
  builtinToolToExecutable: ({ tool }: { tool: { id: string } }) => ({ id: tool.id }),
}));
jest.mock('./run_subagent', () => ({
  createSubagentTool: jest.fn(() => ({ id: 'run_subagent' })),
}));
jest.mock('./send_message', () => ({
  createSendMessageTool: () => ({ id: 'send_message_to_agent' }),
}));
jest.mock('./sleep', () => ({ createSleepTool: () => ({ id: 'sleep' }) }));
jest.mock('./read_file', () => ({ createReadFileTool: () => ({ id: 'read_file' }) }));
jest.mock('./list_files', () => ({ createListFilesTool: () => ({ id: 'list_files' }) }));
jest.mock('./ask_user_question', () => ({
  createAskUserQuestionTool: () => ({ id: 'ask_user_question' }),
}));
jest.mock('./load_skill', () => ({ createLoadSkillTool: () => ({ id: 'load_skill' }) }));
jest.mock('./api', () => ({
  createDiscoverApisTool: () => ({ id: 'discover_apis' }),
  createDescribeApiTool: () => ({ id: 'describe_api' }),
  createDescribeApiTypeTool: () => ({ id: 'describe_api_type' }),
  createExecuteApiTool: () => ({ id: 'execute_api' }),
}));

const SUBAGENT_TOOL_IDS = ['run_subagent', 'send_message_to_agent', 'sleep'];

const resolveAllowedSubagentsMock = resolveAllowedSubagents as jest.MockedFunction<
  typeof resolveAllowedSubagents
>;

const createContext = (overrides: Record<string, unknown> = {}) => {
  const toolManager = { addTools: jest.fn() };
  const context = {
    toolManager,
    runner: {},
    logger: loggerMock.create(),
    modelProvider: {},
    experimentalFeatures: {
      skills: false,
      aiIndices: false,
      relevantSkills: false,
      todos: false,
      bash: false,
      apiDiscovery: false,
    },
    executionMode: AgentExecutionMode.conversation,
    interactivity: { enabled: false },
    defaultConnectorId: 'connector-1',
    subAgentExecutor: {},
    agentRegistry: {},
    filesystemService: {},
    bashService: undefined,
    todoStateManager: {},
    selfClient: {},
    parentExecutionId: undefined,
    conversationAccess: 'readWrite',
    ...overrides,
  } as unknown as AgentHandlerContext;
  return { context, toolManager };
};

const register = async (context: AgentHandlerContext, subagentIds: string[] = ['other-agent']) => {
  const params = {
    context,
    agentId: 'agent-1',
    executionId: 'exec-1',
    backgroundExecutionService: {},
    filteredSkills: [],
    relevantSkillsEnabled: false,
    subagentTracker: {},
    conversationExists: jest.fn(),
    agentConfiguration: { subagent_ids: subagentIds },
  } as unknown as RegisterInternalToolsParams;
  await registerInternalTools(params);
};

const addedToolIds = (toolManager: { addTools: jest.Mock }): string[] =>
  toolManager.addTools.mock.calls[0][0].tools.map((tool: { id: string }) => tool.id);

describe('registerInternalTools - subagents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveAllowedSubagentsMock.mockResolvedValue([
      { id: 'other-agent', description: 'Other agent' },
    ]);
  });

  it('registers the subagent tools when the agent has an allowlist', async () => {
    const { context, toolManager } = createContext();

    await register(context);

    expect(addedToolIds(toolManager)).toEqual(expect.arrayContaining(SUBAGENT_TOOL_IDS));
  });

  it('does not register the subagent tools when the allowlist resolves empty', async () => {
    resolveAllowedSubagentsMock.mockResolvedValue([]);
    const { context, toolManager } = createContext();

    await register(context, []);

    expect(addedToolIds(toolManager)).not.toEqual(expect.arrayContaining(['run_subagent']));
  });

  it('does not register the subagent tools for nested runs', async () => {
    const { context, toolManager } = createContext({ parentExecutionId: 'parent-exec' });

    await register(context);

    expect(addedToolIds(toolManager)).not.toEqual(expect.arrayContaining(['run_subagent']));
  });

  it('does not register the subagent tools in standalone mode', async () => {
    const { context, toolManager } = createContext({
      executionMode: AgentExecutionMode.standalone,
    });

    await register(context);

    expect(addedToolIds(toolManager)).not.toEqual(expect.arrayContaining(['run_subagent']));
  });

  it('registers only a transient-only run_subagent when the run stores nothing', async () => {
    const { context, toolManager } = createContext({ conversationAccess: 'none' });

    await register(context);

    const ids = addedToolIds(toolManager);
    expect(ids).toContain('run_subagent');
    expect(ids).not.toContain('send_message_to_agent');
    expect(ids).not.toContain('sleep');
    expect(createSubagentTool).toHaveBeenCalledWith(
      expect.objectContaining({ transientOnly: true })
    );
  });

  it('registers the full sub-agent tool set when the run stores its conversation', async () => {
    const { context } = createContext();

    await register(context);

    expect(createSubagentTool).toHaveBeenCalledWith(
      expect.objectContaining({ transientOnly: false })
    );
  });
});
