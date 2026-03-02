/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { ChatEventType, ToolResultType, ToolType } from '@kbn/agent-builder-common';
import {
  createToolProviderMock,
  createScopedRunnerMock,
  createToolHandlerContextMock,
} from '../../../../../test_utils/runner';
import { getPlanningTools, type PlanState } from './get_planning_tools';

describe('getPlanningTools', () => {
  let eventEmitter: jest.Mock;
  let planState: PlanState;
  let toolProvider: ReturnType<typeof createToolProviderMock>;
  let runner: ReturnType<typeof createScopedRunnerMock>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let context: ReturnType<typeof createToolHandlerContextMock>;

  const executeTool = async (
    tool: { id: string; execute: (params: any) => Promise<any> },
    toolParams: Record<string, unknown>
  ) => {
    return tool.execute({
      toolParams,
      request: context.request,
      toolCallId: 'test-call',
      source: 'agent' as const,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eventEmitter = jest.fn();
    planState = { current: undefined };
    toolProvider = createToolProviderMock();
    runner = createScopedRunnerMock();
    request = httpServerMock.createKibanaRequest();
    context = createToolHandlerContextMock();

    // Mock runInternalTool to actually invoke the builtin tool handler
    runner.runInternalTool.mockImplementation(async (params: any) => {
      const { tool, toolParams } = params;
      const schema = tool.getSchema();
      const validation = schema.safeParse(toolParams);
      if (!validation.success) {
        throw new Error(`Invalid params: ${validation.error.message}`);
      }
      const handler = tool.getHandler();
      return handler(validation.data, context);
    });
  });

  describe('13.1: Factory returns correct tools per mode', () => {
    it('in planning mode returns create_plan, update_plan, list_available_tools (3 tools)', () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.id)).toEqual([
        'planning.create_plan',
        'planning.update_plan',
        'planning.list_available_tools',
      ]);
      expect(tools.find((t) => t.id === 'planning.suggest_planning_mode')).toBeUndefined();
    });

    it('in agent mode returns create_plan, update_plan, suggest_planning_mode, list_available_tools (4 tools)', () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'agent',
        toolProvider,
        runner,
        request,
      });

      expect(tools).toHaveLength(4);
      expect(tools.map((t) => t.id)).toEqual([
        'planning.create_plan',
        'planning.update_plan',
        'planning.suggest_planning_mode',
        'planning.list_available_tools',
      ]);
    });

    it('all tools have type ToolType.builtin and planning tag', () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'agent',
        toolProvider,
        runner,
        request,
      });

      for (const tool of tools) {
        expect(tool.type).toBe(ToolType.builtin);
        expect(tool.tags).toContain('planning');
      }
    });
  });

  describe('13.2: create_plan tool', () => {
    it('creates a plan with correct title, description, action_items', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      const result = await executeTool(createPlanTool, {
        title: 'Test Plan',
        description: 'A test description',
        action_items: [{ description: 'Step 1' }, { description: 'Step 2' }],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = (result.results[0] as any).data;
      expect(data.message).toContain('Test Plan');
      expect(data.message).toContain('2 action items');
      expect(data.plan).toMatchObject({
        title: 'Test Plan',
        description: 'A test description',
        action_items: [
          { description: 'Step 1', status: 'pending' },
          { description: 'Step 2', status: 'pending' },
        ],
      });
    });

    it('all items start with status pending by default', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'A' }, { description: 'B' }],
      });

      expect(planState.current!.action_items[0].status).toBe('pending');
      expect(planState.current!.action_items[1].status).toBe('pending');
    });

    it('in planning mode: plan has source=planning and status=draft', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Step 1' }],
      });

      expect(planState.current).toMatchObject({
        source: 'planning',
        status: 'draft',
      });
    });

    it('in agent mode: plan has source=agent and status=ready', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'agent',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Step 1' }],
      });

      expect(planState.current).toMatchObject({
        source: 'agent',
        status: 'ready',
      });
    });

    it('stores plan in planState.current', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'Stored Plan',
        action_items: [{ description: 'Item' }],
      });

      expect(planState.current).toBeDefined();
      expect(planState.current!.title).toBe('Stored Plan');
    });

    it('emits ChatEventType.planCreated event via eventEmitter', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'Event Test',
        action_items: [{ description: 'Step' }],
      });

      expect(eventEmitter).toHaveBeenCalledTimes(1);
      expect(eventEmitter).toHaveBeenCalledWith({
        type: ChatEventType.planCreated,
        data: { plan: planState.current },
      });
    });

    it('replaces existing plan when creating a new one', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'First',
        action_items: [{ description: 'Step' }],
      });

      expect(planState.current!.title).toBe('First');

      const result = await executeTool(createPlanTool, {
        title: 'Second',
        action_items: [{ description: 'Another' }],
      });

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(planState.current!.title).toBe('Second');
      expect(planState.current!.action_items).toHaveLength(1);
      expect(planState.current!.action_items[0].description).toBe('Another');
    });

    it('preserves related_skills and related_tools on items', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [
          {
            description: 'Step with skills',
            related_skills: ['alert_triage'],
            related_tools: ['platform.search'],
          },
        ],
      });

      expect(planState.current!.action_items[0]).toMatchObject({
        description: 'Step with skills',
        related_skills: ['alert_triage'],
        related_tools: ['platform.search'],
      });
    });
  });

  describe('13.3: update_plan tool', () => {
    it('returns error when no plan exists', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      const result = await executeTool(updatePlanTool, {
        action_items: [{ index: 0, status: 'in_progress' }],
      });

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as any).data.message).toBe(
        'No plan exists. Use create_plan first.'
      );
    });

    it('updates item statuses (pending -> in_progress, in_progress -> completed)', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Step 1' }, { description: 'Step 2' }],
      });

      await executeTool(updatePlanTool, {
        action_items: [
          { index: 0, status: 'in_progress' },
          { index: 1, status: 'completed' },
        ],
      });

      expect(planState.current!.action_items[0].status).toBe('in_progress');
      expect(planState.current!.action_items[1].status).toBe('completed');
    });

    it('updates item status completed -> failed', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Step' }],
      });

      await executeTool(updatePlanTool, {
        action_items: [{ index: 0, status: 'failed' }],
      });

      expect(planState.current!.action_items[0].status).toBe('failed');
    });

    it('updates plan_status from draft to ready', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Step' }],
      });

      expect(planState.current!.status).toBe('draft');

      await executeTool(updatePlanTool, { status: 'ready' });

      expect(planState.current!.status).toBe('ready');
    });

    it('returns error for invalid index (out of range)', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Only one' }],
      });

      const result = await executeTool(updatePlanTool, {
        action_items: [{ index: 5, status: 'completed' }],
      });

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as any).data.message).toContain('Invalid action item index 5');
      expect((result.results[0] as any).data.message).toContain('1 items');
    });

    it('can update multiple items at once', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'A' }, { description: 'B' }, { description: 'C' }],
      });

      await executeTool(updatePlanTool, {
        action_items: [
          { index: 0, description: 'A updated', status: 'completed' },
          { index: 1, status: 'in_progress' },
          { index: 2, description: 'C updated' },
        ],
      });

      expect(planState.current!.action_items[0]).toMatchObject({
        description: 'A updated',
        status: 'completed',
      });
      expect(planState.current!.action_items[1].status).toBe('in_progress');
      expect(planState.current!.action_items[2].description).toBe('C updated');
    });

    it('emits ChatEventType.planUpdated event', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Step' }],
      });
      eventEmitter.mockClear();

      await executeTool(updatePlanTool, { status: 'ready' });

      expect(eventEmitter).toHaveBeenCalledWith({
        type: ChatEventType.planUpdated,
        data: { plan: planState.current },
      });
    });

    it('can add new_items', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      await executeTool(createPlanTool, {
        title: 'Test',
        action_items: [{ description: 'Original' }],
      });

      await executeTool(updatePlanTool, {
        new_items: [{ description: 'New 1' }, { description: 'New 2' }],
      });

      expect(planState.current!.action_items).toHaveLength(3);
      expect(planState.current!.action_items[1].description).toBe('New 1');
      expect(planState.current!.action_items[2].description).toBe('New 2');
    });

    it('rejects when total items would exceed 50', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;
      const updatePlanTool = tools.find((t) => t.id === 'planning.update_plan')!;

      const existingItems = Array.from({ length: 48 }, (_, i) => ({
        description: `Step ${i + 1}`,
      }));
      await executeTool(createPlanTool, {
        title: 'Big Plan',
        action_items: existingItems,
      });

      const result = await executeTool(updatePlanTool, {
        new_items: [{ description: 'New 1' }, { description: 'New 2' }, { description: 'New 3' }],
      });

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as any).data.message).toContain('51 items');
      expect((result.results[0] as any).data.message).toContain('50 item limit');
    });
  });

  describe('13.4: list_available_tools tool', () => {
    it('lists all tools from toolProvider', async () => {
      const mockTools = [
        {
          id: 'tool.a',
          description: 'Tool A does things',
          type: ToolType.builtin,
          tags: ['a'],
        },
        {
          id: 'tool.b',
          description: 'Tool B does other things',
          type: ToolType.builtin,
          tags: ['b'],
        },
      ];
      toolProvider.list.mockResolvedValue(mockTools as any);

      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const listTool = tools.find((t) => t.id === 'planning.list_available_tools')!;

      const result = await executeTool(listTool, {});

      expect(toolProvider.list).toHaveBeenCalledWith({ request });
      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = (result.results[0] as any).data;
      expect(data.tools).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.tools[0]).toMatchObject({ id: 'tool.a', description: 'Tool A does things' });
      expect(data.tools[1]).toMatchObject({
        id: 'tool.b',
        description: 'Tool B does other things',
      });
    });

    it('applies keyword filter (case-insensitive on id and description)', async () => {
      const mockTools = [
        {
          id: 'platform.search',
          description: 'Search elasticsearch data',
          type: ToolType.builtin,
          tags: [],
        },
        {
          id: 'platform.read_file',
          description: 'Read file contents',
          type: ToolType.builtin,
          tags: [],
        },
      ];
      toolProvider.list.mockResolvedValue(mockTools as any);

      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const listTool = tools.find((t) => t.id === 'planning.list_available_tools')!;

      const result = await executeTool(listTool, { filter: 'SEARCH' });

      const data = (result.results[0] as any).data;
      expect(data.tools).toHaveLength(1);
      expect(data.tools[0].id).toBe('platform.search');
      expect(data.count).toBe(1);
    });

    it('returns empty array when no tools match filter', async () => {
      toolProvider.list.mockResolvedValue([
        {
          id: 'tool.a',
          description: 'Does X',
          type: ToolType.builtin,
          tags: [],
        },
      ] as any);

      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const listTool = tools.find((t) => t.id === 'planning.list_available_tools')!;

      const result = await executeTool(listTool, { filter: 'nonexistent' });

      const data = (result.results[0] as any).data;
      expect(data.tools).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('works with empty tool registry', async () => {
      toolProvider.list.mockResolvedValue([]);

      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'planning',
        toolProvider,
        runner,
        request,
      });
      const listTool = tools.find((t) => t.id === 'planning.list_available_tools')!;

      const result = await executeTool(listTool, {});

      const data = (result.results[0] as any).data;
      expect(data.tools).toEqual([]);
      expect(data.count).toBe(0);
    });
  });

  describe('13.5: suggest_planning_mode tool', () => {
    it('emits ChatEventType.modeSuggestion event with reason and suggested_mode=planning', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'agent',
        toolProvider,
        runner,
        request,
      });
      const suggestTool = tools.find((t) => t.id === 'planning.suggest_planning_mode')!;

      await executeTool(suggestTool, {
        reason: 'This query is complex and would benefit from a plan.',
      });

      expect(eventEmitter).toHaveBeenCalledWith({
        type: ChatEventType.modeSuggestion,
        data: {
          suggested_mode: 'planning',
          reason: 'This query is complex and would benefit from a plan.',
        },
      });
    });

    it('returns confirmation message', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'agent',
        toolProvider,
        runner,
        request,
      });
      const suggestTool = tools.find((t) => t.id === 'planning.suggest_planning_mode')!;

      const result = await executeTool(suggestTool, {
        reason: 'Complex task ahead.',
      });

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0] as any).data.message).toBe(
        'Planning mode suggestion sent to the user.'
      );
      expect((result.results[0] as any).data.reason).toBe('Complex task ahead.');
    });
  });

  describe('13.21: Self-planning in agent mode', () => {
    it('create_plan in agent mode sets source=agent and status=ready', async () => {
      const tools = getPlanningTools({
        eventEmitter,
        planState,
        agentMode: 'agent',
        toolProvider,
        runner,
        request,
      });
      const createPlanTool = tools.find((t) => t.id === 'planning.create_plan')!;

      await executeTool(createPlanTool, {
        title: 'Self-planned',
        action_items: [{ description: 'Execute this' }],
      });

      expect(planState.current!.source).toBe('agent');
      expect(planState.current!.status).toBe('ready');
    });
  });
});
