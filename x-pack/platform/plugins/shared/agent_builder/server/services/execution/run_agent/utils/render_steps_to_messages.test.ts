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
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { wrapToolResultContent } from '@kbn/agent-builder-genai-utils/langchain';
import type { PromptImageResolver } from '../prompts/types';
import { PRESERVED_RECENT_CYCLES } from '../prompts/utils/notices';
import type { RetryNotice, ToolRenderStateMap } from '../transient_state';
import {
  groupToolCallSteps,
  renderCurrentRun,
  renderStepsToMessages,
  type CurrentRenderMode,
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

const base: Omit<CurrentRenderMode, 'renderState'> = {
  type: 'current',
  phase: 'research',
  pendingToolCallIds: [],
  retryNotices: [],
  cycleLimit: 10,
};

const current = (renderState: ToolRenderStateMap, overrides: Partial<CurrentRenderMode> = {}) => ({
  ...base,
  renderState,
  ...overrides,
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

describe('renderStepsToMessages', () => {
  describe('history mode', () => {
    it('renders a grouped tool call with reasoning and wrapped results', async () => {
      const steps: ConversationRoundStep[] = [
        reasoning('group thought', { tool_call_group_id: 'g' }),
        reasoning('why a', { tool_call_group_id: 'g', tool_call_id: 'a' }),
        call('a', { tool_call_group_id: 'g' }),
        call('b', { tool_call_group_id: 'g' }),
      ];
      const messages = await renderStepsToMessages({ steps, mode: { type: 'history' } });

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
      const messages = await renderStepsToMessages({
        steps: [call('a')],
        mode: { type: 'history', resultTransformer },
      });
      expect((messages[1] as ToolMessage).content).toBe(
        wrapToolResultContent(JSON.stringify({ results: [other('summarized')] }))
      );
    });

    it('renders an answered ask_user_question step as a tool call keyed on the prompt id', async () => {
      const step: ConversationRoundStep = {
        type: ConversationRoundStepType.askUserQuestion,
        prompt_id: 'p1',
        questions: [{ question: 'color?', options: [{ label: 'red' }], multi_select: false }],
        answers: [{ choice: [0] }],
      };
      const messages = await renderStepsToMessages({ steps: [step], mode: { type: 'history' } });

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
      expect(await renderStepsToMessages({ steps, mode: { type: 'history' } })).toEqual([]);
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
          status: 'completed',
          response: { message: 'done' },
        },
        {
          type: ConversationRoundStepType.subagentRosterUpdated,
          roster: [{ name: 'sub', conversation_id: 'conv' }],
        },
        { type: ConversationRoundStepType.relevantSkills, skills: [], source: 'implicit' },
      ];
      const messages = await renderStepsToMessages({ steps, mode: { type: 'history' } });
      expect(types(messages)).toEqual(['human', 'human', 'human']);
    });
  });

  describe('current mode', () => {
    it('uses the render state tool name and raw content', async () => {
      const messages = await renderStepsToMessages({
        steps: [call('b1', { tool_id: 'open', params: { url: 'x' } })],
        mode: current({
          b1: { toolName: 'browser_open', kind: 'browser', cycle: 1, content: 'browser said hi' },
        }),
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
      const messages = await renderStepsToMessages({
        steps: [call('old', { tool_id: 'some.tool' })],
        mode: current({}),
      });
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
      const messages = await renderStepsToMessages({
        steps,
        mode: current(rendered('a'), { pendingToolCallIds: ['b', 'c'] }),
      });
      expect(messages).toHaveLength(2);
      expect((messages[0] as AIMessage).tool_calls?.map((c) => c.id)).toEqual(['a']);
    });

    it('renders a partially pending group with the completed calls only', async () => {
      const steps: ConversationRoundStep[] = [
        call('a', { tool_call_group_id: 'g' }),
        call('b', { tool_call_group_id: 'g', results: [] }),
      ];
      const messages = await renderStepsToMessages({
        steps,
        mode: current(rendered('a'), { pendingToolCallIds: ['b'] }),
      });
      expect(types(messages)).toEqual(['ai', 'tool']);
      expect((messages[0] as AIMessage).tool_calls?.map((c) => c.id)).toEqual(['a']);
    });

    it('renders an empty-results completed call', async () => {
      const messages = await renderStepsToMessages({
        steps: [call('c1', { results: [] })],
        mode: current(rendered('c1', { content: '{"results":[]}' })),
      });
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
      const messages = await renderStepsToMessages({
        steps: [
          call('c1'),
          { type: ConversationRoundStepType.updateTodos, todos: [] },
          call('c2', { tool_call_group_id: 'g2' }),
        ],
        mode: current({ ...rendered('c1'), ...rendered('c2', { cycle: 2 }) }, { retryNotices }),
      });
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
      const five = await renderStepsToMessages({
        steps: [call('c1')],
        mode: current(rendered('c1'), { cycleLimit: 6 }),
      });
      expect(types(five)).toEqual(['ai', 'tool', 'human']);
      expect(five[2]).toBeInstanceOf(HumanMessage);
      expect(five[2].content).toContain('5');

      const one = await renderStepsToMessages({
        steps: [call('c1')],
        mode: current(rendered('c1'), { cycleLimit: 2 }),
      });
      expect(types(one)).toEqual(['ai', 'tool', 'human']);

      const plenty = await renderStepsToMessages({
        steps: [call('c1')],
        mode: current(rendered('c1'), { cycleLimit: 10 }),
      });
      expect(types(plenty)).toEqual(['ai', 'tool']);
    });

    it('renders the handover and answer retries only in answer phase', async () => {
      const error = createAgentExecutionError('bad', AgentExecutionErrorCode.emptyResponse, {});
      const retryNotices: RetryNotice[] = [{ phase: 'answer', afterNonTodosStepCount: 0, error }];
      const handover = { message: 'here you go', forceful: false };

      const answer = await renderStepsToMessages({
        steps: [],
        mode: current({}, { phase: 'answer', handover, retryNotices }),
      });
      expect(types(answer)).toEqual(['ai', 'human', 'ai', 'human']);
      expect(answer[0].content).toContain('here you go');

      const research = await renderStepsToMessages({
        steps: [],
        mode: current({}, { phase: 'research', handover, retryNotices }),
      });
      expect(research).toEqual([]);
    });

    it('does not render relevant_skills in answer phase', async () => {
      const skills: ConversationRoundStep = {
        type: ConversationRoundStepType.relevantSkills,
        skills: [{ id: 's', name: 's', path: '/s', description: 'd' }],
        source: 'implicit',
      };
      const research = await renderStepsToMessages({ steps: [skills], mode: current({}) });
      const answer = await renderStepsToMessages({
        steps: [skills],
        mode: current({}, { phase: 'answer' }),
      });
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
      const messages = await renderStepsToMessages({
        steps: [call('c1', { results })],
        mode: current(rendered('c1'), { imageResolver }),
      });
      expect(types(messages)).toEqual(['ai', 'tool', 'human', 'human']);
      expect(messages[2].content).toContain('could not be loaded');
      expect(messages[3].content).toEqual([
        { type: 'text', text: expect.stringContaining('attachment_id="ok"') },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
      ]);
    });

    describe('in-flight compaction', () => {
      const compacting: ToolCallResultTransformer = async () => [other('compacted')];
      const compactedContent = JSON.stringify({ results: [other('compacted')] });
      const bigSteps = (count: number) =>
        Array.from({ length: count }, (_, i) =>
          call(`c${i}`, { results: [other(`c${i}`, { payload: 'x'.repeat(60_000) })] })
        );
      const bigRender = (count: number): ToolRenderStateMap =>
        Object.assign(
          {},
          ...Array.from({ length: count }, (_, i) =>
            rendered(`c${i}`, {
              cycle: i + 1,
              content: JSON.stringify({
                results: [other(`c${i}`, { payload: 'x'.repeat(60_000) })],
              }),
            })
          )
        );

      it('compacts cycles older than the preserved ones when the compaction mode is set', async () => {
        const messages = await renderStepsToMessages({
          steps: bigSteps(4),
          mode: current(bigRender(4), { compaction: { resultTransformer: compacting } }),
        });
        const toolContents = messages
          .filter((m) => m.getType() === 'tool')
          .map((m) => m.content as string);
        const compactedCount = 4 - PRESERVED_RECENT_CYCLES;
        expect(toolContents.map((c) => c === wrapToolResultContent(compactedContent))).toEqual(
          Array.from({ length: 4 }, (_, i) => i < compactedCount)
        );
      });

      it('does not count pending calls toward the compaction cutoff', async () => {
        const steps = [...bigSteps(4), call('final', { results: [] })];
        const messages = await renderStepsToMessages({
          steps,
          mode: current(
            { ...bigRender(4), ...rendered('final', { cycle: 5, content: undefined }) },
            { pendingToolCallIds: ['final'], compaction: { resultTransformer: compacting } }
          ),
        });
        const compacted = messages.filter(
          (m) => m.getType() === 'tool' && m.content === wrapToolResultContent(compactedContent)
        );
        expect(compacted).toHaveLength(4 - PRESERVED_RECENT_CYCLES);
      });

      it('keeps the raw content when the compacted form is not smaller', async () => {
        const growing: ToolCallResultTransformer = async () => [
          other('big', { payload: 'y'.repeat(100_000) }),
        ];
        const messages = await renderStepsToMessages({
          steps: bigSteps(4),
          mode: current(bigRender(4), { compaction: { resultTransformer: growing } }),
        });
        const toolContents = messages
          .filter((m) => m.getType() === 'tool')
          .map((m) => m.content as string);
        expect(toolContents.every((c) => c.includes('xxx') && !c.includes('yyy'))).toBe(true);
      });
    });
  });
});

describe('renderCurrentRun', () => {
  const compacting: ToolCallResultTransformer = async () => [other('compacted')];

  it('returns the raw rendering under the token threshold', async () => {
    const messages = await renderCurrentRun({
      steps: [call('a')],
      mode: current(rendered('a')),
      compaction: { resultTransformer: compacting },
    });
    expect((messages[1] as ToolMessage).content).toContain('"id":"a"');
  });

  it('re-renders with compaction when the raw rendering exceeds the threshold', async () => {
    const huge = 'x'.repeat(400_000);
    const steps = Array.from({ length: 4 }, (_, i) =>
      call(`c${i}`, { results: [other(`c${i}`, { payload: huge })] })
    );
    const renderState: ToolRenderStateMap = Object.assign(
      {},
      ...steps.map((s, i) =>
        rendered(s.tool_call_id, {
          cycle: i + 1,
          content: JSON.stringify({ results: s.results }),
        })
      )
    );
    const messages = await renderCurrentRun({
      steps,
      mode: current(renderState),
      compaction: { resultTransformer: compacting },
    });
    const toolContents = messages
      .filter((m) => m.getType() === 'tool')
      .map((m) => m.content as string);
    expect(toolContents.filter((c) => c.includes('compacted'))).toHaveLength(
      4 - PRESERVED_RECENT_CYCLES
    );
  });

  it('never compacts without a transformer', async () => {
    const huge = 'x'.repeat(400_000);
    const steps = Array.from({ length: 4 }, (_, i) =>
      call(`c${i}`, { results: [other(`c${i}`, { payload: huge })] })
    );
    const messages = await renderCurrentRun({ steps, mode: current({}) });
    expect(messages.every((m) => !(m.content as string).includes('compacted'))).toBe(true);
  });
});
