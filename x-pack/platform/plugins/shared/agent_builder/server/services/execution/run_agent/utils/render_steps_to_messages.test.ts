/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessage, ToolMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import type {
  ConversationRoundStep,
  ReasoningStep,
  ToolCallStep,
  ToolResult,
} from '@kbn/agent-builder-common';
import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode, ExecutionStatus } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { wrapToolResultContent } from '@kbn/agent-builder-genai-utils/langchain';
import type { PromptImageResolver } from '../prompts/types';
import type { CurrentRun, RetryNotice, ToolRenderStateMap } from '../transient_state';
import {
  groupToolCallSteps,
  renderCurrentRun,
  renderHistorySteps,
  type CurrentRunRenderOptions,
} from './render_steps_to_messages';
import type { ToolCallResultTransformer } from './tool_summarization';

const other = (id: string, data: object = { id }): ToolResult => ({
  tool_result_id: `r-${id}`,
  type: ToolResultType.other,
  data,
});

const call = (id: string, overrides: Partial<ToolCallStep> = {}): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my.tool',
  tool_call_group_id: `g-${id}`,
  params: { q: id },
  results: [other(id)],
  progression: [],
  ...overrides,
});

const reasoning = (
  text: string,
  refs: { tool_call_group_id?: string; tool_call_id?: string } = {}
): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
  ...refs,
});

const rendered = (id: string, extra: Partial<ToolRenderStateMap[string]> = {}) => ({
  [id]: {
    toolName: 'my_tool',
    kind: 'server' as const,
    cycle: 1,
    content: JSON.stringify({ results: [other(id)] }),
    ...extra,
  },
});

type CurrentOverrides = Partial<Omit<CurrentRun, 'steps' | 'renderState'>> &
  Partial<CurrentRunRenderOptions>;

/** Renders `steps` as the current run, with the run state and render options defaulted. */
const current = (
  steps: ConversationRoundStep[],
  renderState: ToolRenderStateMap,
  {
    cycleLimit = 10,
    pendingToolCallIds = [],
    retryNotices = [],
    phase = 'research',
    ...options
  }: CurrentOverrides = {}
) =>
  renderCurrentRun({
    run: { steps, renderState, cycleLimit, pendingToolCallIds, retryNotices },
    phase,
    ...options,
  });

const types = (messages: Array<{ getType: () => string }>) => messages.map((m) => m.getType());

describe('groupToolCallSteps', () => {
  it('groups consecutive calls sharing a group id and keeps ungrouped calls separate', () => {
    const steps: ConversationRoundStep[] = [
      call('a', { tool_call_group_id: 'g1' }),
      reasoning('between', { tool_call_group_id: 'g1' }),
      call('b', { tool_call_group_id: 'g1' }),
      call('c', { tool_call_group_id: undefined }),
      call('d', { tool_call_group_id: undefined }),
      call('e', { tool_call_group_id: 'g2' }),
    ];
    expect(groupToolCallSteps(steps).map((g) => g.map((s) => s.tool_call_id))).toEqual([
      ['a', 'b'],
      ['c'],
      ['d'],
      ['e'],
    ]);
  });
});

describe('renderHistorySteps', () => {
  it('renders a grouped tool call with reasoning and wrapped results', async () => {
    const steps: ConversationRoundStep[] = [
      reasoning('group thought', { tool_call_group_id: 'g' }),
      reasoning('why a', { tool_call_group_id: 'g', tool_call_id: 'a' }),
      call('a', { tool_call_group_id: 'g' }),
      call('b', { tool_call_group_id: 'g' }),
    ];
    const messages = await renderHistorySteps({ steps });

    expect(messages).toHaveLength(3);
    const [ai, toolA, toolB] = messages as [AIMessage, ToolMessage, ToolMessage];
    expect(ai.content).toBe('group thought');
    expect(ai.tool_calls).toEqual([
      { id: 'a', name: 'my_tool', args: { _reasoning: 'why a', q: 'a' }, type: 'tool_call' },
      { id: 'b', name: 'my_tool', args: { q: 'b' }, type: 'tool_call' },
    ]);
    expect(toolA.tool_call_id).toBe('a');
    expect(toolA.content).toBe(wrapToolResultContent(JSON.stringify({ results: [other('a')] })));
    expect(toolB.tool_call_id).toBe('b');
  });

  it('passes results through the transformer', async () => {
    const resultTransformer: ToolCallResultTransformer = async () => [other('summarized')];
    const messages = await renderHistorySteps({ steps: [call('a')], resultTransformer });
    expect((messages[1] as ToolMessage).content).toBe(
      wrapToolResultContent(JSON.stringify({ results: [other('summarized')] }))
    );
  });

  it('renders a marked call as the interrupted tool message and an unmarked empty return as results: []', async () => {
    const resultTransformer: ToolCallResultTransformer = jest.fn(async () => [other('summarized')]);
    const messages = await renderHistorySteps({
      steps: [call('a', { results: [], interrupted: true }), call('b', { results: [] })],
      resultTransformer,
    });

    const tools = messages.filter((message) => message.getType() === 'tool') as ToolMessage[];
    expect(tools).toHaveLength(2);
    expect(tools[0].tool_call_id).toBe('a');
    expect(String(tools[0].content)).toContain('"interrupted":true');
    expect(String(tools[0].content)).toContain(
      'The tool call was interrupted before it returned a result.'
    );
    // the interrupted call never went through the transformer; the unmarked one did
    expect(resultTransformer).toHaveBeenCalledTimes(1);
    expect(String(tools[1].content)).toContain('summarized');
  });

  it('renders an unmarked empty return as results: [] without a transformer', async () => {
    const messages = await renderHistorySteps({ steps: [call('b', { results: [] })] });
    expect((messages[1] as ToolMessage).content).toBe(
      wrapToolResultContent(JSON.stringify({ results: [] }))
    );
  });

  it('renders an answered ask_user_question step as a tool call keyed on the prompt id', async () => {
    const step: ConversationRoundStep = {
      type: ConversationRoundStepType.askUserQuestion,
      prompt_id: 'p1',
      questions: [{ question: 'color?', options: [{ label: 'red' }], multi_select: false }],
      answers: [{ choice: [0] }],
    };
    const messages = await renderHistorySteps({ steps: [step] });

    expect(messages).toHaveLength(2);
    const [ai, tool] = messages as [AIMessage, ToolMessage];
    expect(ai.tool_calls).toEqual([
      {
        id: 'p1',
        name: internalTools.askUserQuestion,
        args: { questions: step.questions },
        type: 'tool_call',
      },
    ]);
    expect(tool.tool_call_id).toBe('p1');
    expect(tool.content).toBe(
      wrapToolResultContent(
        JSON.stringify({ answers: [{ question: 'color?', selected_options: ['red'] }] })
      )
    );
  });

  it('skips unanswered questions, todos, compaction and reasoning without a group', async () => {
    const steps: ConversationRoundStep[] = [
      {
        type: ConversationRoundStepType.askUserQuestion,
        prompt_id: 'p1',
        questions: [],
      },
      { type: ConversationRoundStepType.updateTodos, todos: [] },
      reasoning('lonely'),
    ];
    expect(await renderHistorySteps({ steps })).toEqual([]);
  });

  it('renders relevant skills, background completions and roster notices as user messages', async () => {
    const steps: ConversationRoundStep[] = [
      {
        type: ConversationRoundStepType.relevantSkills,
        skills: [{ id: 's1', name: 'skill', path: '/s1', description: 'd' }],
        source: 'implicit',
      },
      {
        type: ConversationRoundStepType.backgroundAgentComplete,
        execution_id: 'x1',
        status: ExecutionStatus.completed,
        response: { message: 'done' },
      },
      {
        type: ConversationRoundStepType.subagentRosterUpdated,
        roster: [{ name: 'sub', conversation_id: 'conv' }],
      },
      { type: ConversationRoundStepType.relevantSkills, skills: [], source: 'implicit' },
    ];
    const messages = await renderHistorySteps({ steps });
    expect(types(messages)).toEqual(['human', 'human', 'human']);
  });
});

describe('renderCurrentRun', () => {
  it('uses the render state tool name and raw content', async () => {
    const messages = await current([call('b1', { tool_id: 'open', params: { url: 'x' } })], {
      b1: { toolName: 'browser_open', kind: 'browser', cycle: 1, content: 'browser said hi' },
    });
    const [ai, tool] = messages as [AIMessage, ToolMessage];
    expect(ai.tool_calls?.[0]).toEqual({
      id: 'b1',
      name: 'browser_open',
      args: { url: 'x' },
      type: 'tool_call',
    });
    expect(tool.content).toBe(wrapToolResultContent('browser said hi'));
  });

  it('falls back to the sanitized tool id and serialized results without render state', async () => {
    const messages = await current([call('old', { tool_id: 'some.tool' })], {});
    const [ai, tool] = messages as [AIMessage, ToolMessage];
    expect(ai.tool_calls?.[0].name).toBe('some_tool');
    expect(tool.content).toBe(wrapToolResultContent(JSON.stringify({ results: [other('old')] })));
  });

  it('skips pending calls (and whole pending groups)', async () => {
    const steps: ConversationRoundStep[] = [
      call('a'),
      reasoning('next', { tool_call_group_id: 'g2' }),
      call('b', { tool_call_group_id: 'g2', results: [] }),
      call('c', { tool_call_group_id: 'g2', results: [] }),
    ];
    const messages = await current(steps, rendered('a'), { pendingToolCallIds: ['b', 'c'] });
    expect(messages).toHaveLength(2);
    expect((messages[0] as AIMessage).tool_calls?.map((c) => c.id)).toEqual(['a']);
  });

  it('renders a partially pending group with the completed calls only', async () => {
    const steps: ConversationRoundStep[] = [
      call('a', { tool_call_group_id: 'g' }),
      call('b', { tool_call_group_id: 'g', results: [] }),
    ];
    const messages = await current(steps, rendered('a'), { pendingToolCallIds: ['b'] });
    expect(types(messages)).toEqual(['ai', 'tool']);
    expect((messages[0] as AIMessage).tool_calls?.map((c) => c.id)).toEqual(['a']);
  });

  it('renders an empty-results completed call', async () => {
    const messages = await current(
      [call('c1', { results: [] })],
      rendered('c1', { content: '{"results":[]}' })
    );
    expect(types(messages)).toEqual(['ai', 'tool']);
    expect((messages[1] as ToolMessage).content).toBe(wrapToolResultContent('{"results":[]}'));
  });

  it('positions research retry notices after the recorded non-todos step count, ignoring todos', async () => {
    const error = createAgentExecutionError('bad', AgentExecutionErrorCode.emptyResponse, {});
    const retryNotices: RetryNotice[] = [
      { phase: 'research', afterNonTodosStepCount: 0, error },
      { phase: 'research', afterNonTodosStepCount: 1, error },
      { phase: 'research', afterNonTodosStepCount: 2, error },
    ];
    const messages = await current(
      [
        call('c1'),
        { type: ConversationRoundStepType.updateTodos, todos: [] },
        call('c2', { tool_call_group_id: 'g2' }),
      ],
      { ...rendered('c1'), ...rendered('c2', { cycle: 2 }) },
      { retryNotices }
    );
    expect(types(messages)).toEqual([
      'ai',
      'human', // retry before any step
      'ai',
      'tool',
      'ai',
      'human', // retry after c1
      'ai',
      'tool',
      'ai',
      'human', // retry after c2
    ]);
  });

  it('adds the cycle-limit notice when 5 or 1 cycles remain', async () => {
    const five = await current([call('c1')], rendered('c1'), { cycleLimit: 6 });
    expect(types(five)).toEqual(['ai', 'tool', 'human']);
    expect(five[2]).toBeInstanceOf(HumanMessage);
    expect(five[2].content).toContain('5');

    const one = await current([call('c1')], rendered('c1'), { cycleLimit: 2 });
    expect(types(one)).toEqual(['ai', 'tool', 'human']);

    const plenty = await current([call('c1')], rendered('c1'), { cycleLimit: 10 });
    expect(types(plenty)).toEqual(['ai', 'tool']);
  });

  it('renders the handover and answer retries only in answer phase', async () => {
    const error = createAgentExecutionError('bad', AgentExecutionErrorCode.emptyResponse, {});
    const retryNotices: RetryNotice[] = [{ phase: 'answer', afterNonTodosStepCount: 0, error }];
    const handover = { message: 'here you go', forceful: false };

    const answer = await current([], {}, { phase: 'answer', handover, retryNotices });
    expect(types(answer)).toEqual(['ai', 'human', 'ai', 'human']);
    expect(answer[0].content).toContain('here you go');

    const research = await current([], {}, { phase: 'research', handover, retryNotices });
    expect(research).toEqual([]);
  });

  it('does not render relevant_skills in answer phase', async () => {
    const skills: ConversationRoundStep = {
      type: ConversationRoundStepType.relevantSkills,
      skills: [{ id: 's', name: 's', path: '/s', description: 'd' }],
      source: 'implicit',
    };
    const research = await current([skills], {});
    const answer = await current([skills], {}, { phase: 'answer' });
    expect(research).toHaveLength(1);
    expect(answer).toHaveLength(0);
  });

  it('injects resolved images after the group and a notice for failed ones', async () => {
    const imageResolver: PromptImageResolver = async ({ attachmentId }) =>
      attachmentId === 'ok' ? { base64: 'AAA', mimeType: 'image/png' } : undefined;
    const results: ToolResult[] = [
      {
        tool_result_id: 'i1',
        type: ToolResultType.image,
        data: { attachment_id: 'ok', mime_type: 'image/png', name: 'pic', description: '' },
      },
      {
        tool_result_id: 'i2',
        type: ToolResultType.image,
        data: { attachment_id: 'missing', mime_type: 'image/png', description: '' },
      },
    ];
    const messages = await current([call('c1', { results })], rendered('c1'), { imageResolver });
    expect(types(messages)).toEqual(['ai', 'tool', 'human', 'human']);
    expect(messages[2].content).toContain('could not be loaded');
    expect(messages[3].content).toEqual([
      { type: 'text', text: expect.stringContaining('attachment_id="ok"') },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
    ]);
  });

  describe('range', () => {
    const error = createAgentExecutionError('bad', AgentExecutionErrorCode.emptyResponse, {});
    const steps: ConversationRoundStep[] = [
      call('c1'),
      call('c2', { tool_call_group_id: 'g2' }),
      call('c3', { tool_call_group_id: 'g3' }),
    ];
    const renderState = {
      ...rendered('c1'),
      ...rendered('c2', { cycle: 2 }),
      ...rendered('c3', { cycle: 3 }),
    };
    const renderedIds = (messages: Awaited<ReturnType<typeof current>>) =>
      messages.flatMap((m) =>
        m.getType() === 'ai' ? (m as AIMessage).tool_calls?.map((c) => c.id) ?? [] : []
      );

    it('renders only the steps from the range start', async () => {
      const messages = await current(steps, renderState, { range: { start: 1 } });
      expect(renderedIds(messages)).toEqual(['c2', 'c3']);
    });

    it('renders only the steps up to the range end', async () => {
      const messages = await current(steps, renderState, { range: { start: 0, end: 1 } });
      expect(renderedIds(messages)).toEqual(['c1', 'c2']);
    });

    it('drops retry notices within the hidden steps and keeps the one at the range start', async () => {
      const retryNotices: RetryNotice[] = [
        { phase: 'research', afterNonTodosStepCount: 0, error },
        { phase: 'research', afterNonTodosStepCount: 1, error },
        { phase: 'research', afterNonTodosStepCount: 3, error },
      ];
      const messages = await current(steps, renderState, { range: { start: 1 }, retryNotices });
      expect(types(messages)).toEqual(['ai', 'human', 'ai', 'tool', 'ai', 'tool', 'ai', 'human']);
    });

    it('leaves the retry notice after the range end to the steps that follow', async () => {
      const retryNotices: RetryNotice[] = [{ phase: 'research', afterNonTodosStepCount: 2, error }];
      const head = await current(steps, renderState, { range: { start: 0, end: 1 }, retryNotices });
      const tail = await current(steps, renderState, { range: { start: 2 }, retryNotices });
      expect(types(head)).toEqual(['ai', 'tool', 'ai', 'tool']);
      expect(types(tail)).toEqual(['ai', 'human', 'ai', 'tool']);
    });

    it('keeps the cycle-limit notice keyed on the run cycle of the rendered groups', async () => {
      const messages = await current(steps, renderState, { range: { start: 2 }, cycleLimit: 8 });
      expect(types(messages)).toEqual(['ai', 'tool', 'human']);
    });
  });

  describe('substitution', () => {
    const substitute: ToolCallResultTransformer = async (toolCall) => [
      {
        tool_result_id: `r-${toolCall.tool_call_id}`,
        type: ToolResultType.fileReference,
        data: { filepath: `/f/${toolCall.tool_call_id}`, comment: 'stored' },
      },
    ];

    it('renders marked calls through the substitute and others from the render state', async () => {
      const messages = await current(
        [call('a', { tool_call_group_id: 'g' }), call('b', { tool_call_group_id: 'g' })],
        { ...rendered('a'), ...rendered('b') },
        { substitution: { marks: new Set(['a']), substitute } }
      );
      const [, toolA, toolB] = messages as [AIMessage, ToolMessage, ToolMessage];
      expect(toolA.content).toBe(
        wrapToolResultContent(JSON.stringify({ results: await substitute(call('a')) }))
      );
      expect(toolB.content).toBe(wrapToolResultContent(JSON.stringify({ results: [other('b')] })));
    });

    it('does not inject the images of substituted calls', async () => {
      const imageResolver: PromptImageResolver = jest.fn(async () => ({
        base64: 'AAA',
        mimeType: 'image/png',
      }));
      const results: ToolResult[] = [
        {
          tool_result_id: 'i1',
          type: ToolResultType.image,
          data: { attachment_id: 'ok', mime_type: 'image/png', name: 'pic', description: '' },
        },
      ];
      const messages = await current([call('c1', { results })], rendered('c1'), {
        imageResolver,
        substitution: { marks: new Set(['c1']), substitute },
      });
      expect(types(messages)).toEqual(['ai', 'tool']);
      expect(imageResolver).not.toHaveBeenCalled();
    });

    it('injects the images of a marked call that were left inline', async () => {
      const imageResolver: PromptImageResolver = jest.fn(async () => ({
        base64: 'AAA',
        mimeType: 'image/png',
      }));
      const image: ToolResult = {
        tool_result_id: 'i1',
        type: ToolResultType.image,
        data: { attachment_id: 'ok', mime_type: 'image/png', name: 'pic', description: '' },
      };
      const keepImages: ToolCallResultTransformer = async (toolCall) =>
        toolCall.results.map((result) =>
          result.type === ToolResultType.image
            ? result
            : {
                tool_result_id: result.tool_result_id,
                type: ToolResultType.fileReference,
                data: { filepath: `/f/${result.tool_result_id}`, comment: 'stored' },
              }
        );
      const messages = await current(
        [call('c1', { results: [other('c1'), image] })],
        rendered('c1'),
        { imageResolver, substitution: { marks: new Set(['c1']), substitute: keepImages } }
      );
      expect(types(messages)).toEqual(['ai', 'tool', 'human']);
      expect(imageResolver).toHaveBeenCalledWith({ attachmentId: 'ok' });
    });
  });
});
