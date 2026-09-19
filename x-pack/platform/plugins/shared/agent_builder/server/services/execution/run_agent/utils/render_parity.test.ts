/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Temporary: deleted together with the action renderer. Proves byte-equivalence of the
// current-run prompt between the legacy action renderer and the step renderer.

import type { BaseMessage } from '@langchain/core/messages';
import { AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import type { ConversationRoundStep, ToolResult } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import { errorAction, handoverAction, type ResearchAgentAction } from '../actions';
import {
  processResearchResponse as legacyProcessResearch,
  processToolNodeResponse as legacyProcessTool,
} from '../action_utils';
import { formatAnswerActionHistory, formatResearcherActionHistory } from '../prompts/utils/actions';
import type { PromptImageResolver } from '../prompts/types';
import { processResearchResponse, processToolNodeResponse } from '../response_processing';
import { applyStepUpdates, countNonTodosSteps } from '../step_state';
import {
  mergeToolRenderState,
  type RetryNotice,
  type ToolRenderStateMap,
} from '../transient_state';
import type { ToolCallResultTransformer } from './tool_summarization';
import { renderStepsToMessages, renderCurrentRun } from './render_steps_to_messages';

const askName = internalTools.askUserQuestion.replace(/\./g, '_');

const toolManager = {
  getToolIdMapping: () =>
    new Map([
      ['my_tool', 'my.tool'],
      ['browser_open', 'browser_open'],
      [askName, internalTools.askUserQuestion],
    ]),
  getToolMeta: () => ({ origin: undefined, type: undefined }),
} as unknown as ToolManager;

const normalize = (messages: BaseMessage[]) =>
  messages.map((m) => ({
    type: m.getType(),
    content: m.content,
    name: m.name,
    tool_calls:
      'tool_calls' in m
        ? (m as any).tool_calls?.map(({ id, name, args }: any) => ({ id, name, args }))
        : undefined,
    tool_call_id: 'tool_call_id' in m ? (m as any).tool_call_id : undefined,
  }));

interface ModelCall {
  id: string;
  args: Record<string, unknown>;
  name?: string;
}

const modelTurn = (text: string, calls: ModelCall[]) =>
  new AIMessageChunk({
    content: text,
    tool_calls: calls.map((c) => ({ id: c.id, name: c.name ?? 'my_tool', args: c.args })),
  });

const otherResult = (id: string, data: object = { id }): ToolResult => ({
  tool_result_id: `r-${id}`,
  type: ToolResultType.other,
  data,
});

interface ToolReply {
  id: string;
  results?: ToolResult[];
  /** overrides the content (guarded / truncated / error content) */
  content?: string;
  /** when false, no artifact is attached (schema validation error) */
  artifact?: boolean;
}

const toolTurn = (replies: Array<string | ToolReply>) =>
  replies.map((reply) => {
    const r: ToolReply = typeof reply === 'string' ? { id: reply } : reply;
    const artifact = { results: r.results ?? [otherResult(r.id)] };
    return new ToolMessage({
      tool_call_id: r.id,
      content: r.content ?? JSON.stringify(artifact),
      ...(r.artifact === false ? {} : { artifact }),
    });
  });

type Turn =
  | { model: AIMessageChunk; tools?: Array<string | ToolReply> }
  | { retry: AgentExecutionErrorCode };

interface Harness {
  cycleLimit?: number;
  resultTransformer?: ToolCallResultTransformer;
  imageResolver?: PromptImageResolver;
  /** answer phase: handover + answer retries */
  answer?: { handover: { message: string; forceful: boolean }; retries: AgentExecutionErrorCode[] };
}

const runBoth = async (turns: Turn[], harness: Harness = {}) => {
  const cycleLimit = harness.cycleLimit ?? 10;

  // ---- legacy
  const actions: ResearchAgentAction[] = [];
  let legacyCycle = 0;
  for (const turn of turns) {
    if ('retry' in turn) {
      actions.push(errorAction(createAgentExecutionError('bad', turn.retry, {})));
      continue;
    }
    legacyCycle += 1;
    actions.push(legacyProcessResearch(turn.model, { cycle: legacyCycle }));
    if (turn.tools) {
      actions.push(...legacyProcessTool(toolTurn(turn.tools), { cycle: legacyCycle }));
    }
  }
  if (harness.answer) {
    actions.push(handoverAction(harness.answer.handover.message, harness.answer.handover.forceful));
  }
  // the legacy renderers are typed as BaseMessageLike[] but only ever return message instances
  const legacyResearch = (await formatResearcherActionHistory({
    actions,
    cycleLimit,
    resultTransformer: harness.resultTransformer,
    toolManager: harness.resultTransformer ? toolManager : undefined,
    imageResolver: harness.imageResolver,
  })) as BaseMessage[];
  const legacyMessages: BaseMessage[] = harness.answer
    ? [
        ...legacyResearch,
        ...(formatAnswerActionHistory({
          actions: harness.answer.retries.map((code) =>
            errorAction(createAgentExecutionError('bad', code, {}))
          ),
        }) as BaseMessage[]),
      ]
    : legacyResearch;

  // ---- new
  let steps: ConversationRoundStep[] = [];
  let renderState: ToolRenderStateMap = {};
  let pendingToolCallIds: string[] = [];
  const retryNotices: RetryNotice[] = [];
  let cycle = 0;
  for (const turn of turns) {
    if ('retry' in turn) {
      retryNotices.push({
        phase: 'research',
        afterNonTodosStepCount: countNonTodosSteps(steps),
        error: createAgentExecutionError('bad', turn.retry, {}),
      });
      continue;
    }
    cycle += 1;
    const research = processResearchResponse(turn.model, { cycle, toolManager });
    steps = applyStepUpdates(steps, research.stepUpdates);
    renderState = mergeToolRenderState(renderState, research.renderState);
    pendingToolCallIds = research.pendingToolCallIds;
    if (turn.tools) {
      const tool = processToolNodeResponse(toolTurn(turn.tools), {
        cycle,
        drainProgress: () => [],
        toolIdFor: (toolCallId) => {
          const step = steps.find((s) => 'tool_call_id' in s && s.tool_call_id === toolCallId);
          return step && 'tool_id' in step ? step.tool_id : 'unknown';
        },
      });
      steps = applyStepUpdates(steps, tool.stepUpdates);
      renderState = mergeToolRenderState(renderState, tool.renderState);
      const completed = new Set(tool.completedToolCallIds);
      pendingToolCallIds = pendingToolCallIds.filter((id) => !completed.has(id));
    }
  }
  if (harness.answer) {
    for (const code of harness.answer.retries) {
      retryNotices.push({
        phase: 'answer',
        afterNonTodosStepCount: countNonTodosSteps(steps),
        error: createAgentExecutionError('bad', code, {}),
      });
    }
  }
  const newMessages = await renderCurrentRun({
    steps,
    mode: {
      type: 'current',
      phase: harness.answer ? 'answer' : 'research',
      renderState,
      pendingToolCallIds,
      retryNotices,
      cycleLimit,
      handover: harness.answer?.handover,
      imageResolver: harness.imageResolver,
    },
    compaction: harness.resultTransformer
      ? { resultTransformer: harness.resultTransformer }
      : undefined,
  });

  return { legacyMessages, newMessages, steps, renderState };
};

const expectParity = ({
  legacyMessages,
  newMessages,
}: {
  legacyMessages: BaseMessage[];
  newMessages: BaseMessage[];
}) => {
  expect(normalize(newMessages)).toEqual(normalize(legacyMessages));
  expect(newMessages.length).toBeGreaterThan(0);
};

describe('current-run render parity with the action renderer', () => {
  it('1. matches for two cycles of parallel tool calls followed by a handover', async () => {
    const result = await runBoth([
      {
        model: modelTurn('first', [
          { id: 'a', args: { _reasoning: 'r-a', q: 1 } },
          { id: 'b', args: { q: 2 } },
        ]),
        tools: ['a', 'b'],
      },
      { model: modelTurn('', [{ id: 'c', args: { q: 3 } }]), tools: ['c'] },
    ]);
    expectParity(result);
    expect(result.newMessages).toHaveLength(5);
  });

  it('2. matches for a mixed browser + server batch', async () => {
    const result = await runBoth([
      {
        model: modelTurn('mixed', [
          { id: 'b1', args: { url: 'x' }, name: 'browser_open' },
          { id: 's1', args: { q: 1 } },
        ]),
        tools: [{ id: 'b1', content: 'browser says hi', results: [] }, 's1'],
      },
    ]);
    expectParity(result);
    expect((result.newMessages[0] as any).tool_calls[0].name).toBe('browser_open');
  });

  it('3. matches for a research retry between two cycles', async () => {
    const result = await runBoth([
      { model: modelTurn('one', [{ id: 'a', args: {} }]), tools: ['a'] },
      { retry: AgentExecutionErrorCode.emptyResponse },
      { model: modelTurn('two', [{ id: 'b', args: {} }]), tools: ['b'] },
    ]);
    expectParity(result);
    expect(result.newMessages.map((m) => m.getType())).toEqual([
      'ai',
      'tool',
      'ai',
      'human',
      'ai',
      'tool',
    ]);
  });

  it('3b. matches for a research retry before any step and at the very end', async () => {
    const result = await runBoth([
      { retry: AgentExecutionErrorCode.emptyResponse },
      { model: modelTurn('one', [{ id: 'a', args: {} }]), tools: ['a'] },
      { retry: AgentExecutionErrorCode.emptyResponse },
    ]);
    expectParity(result);
  });

  it('4. matches for cycle-limit notices (5 and 1 remaining)', async () => {
    const five = await runBoth([{ model: modelTurn('', [{ id: 'a', args: {} }]), tools: ['a'] }], {
      cycleLimit: 6,
    });
    expectParity(five);
    expect(five.newMessages).toHaveLength(3);

    const one = await runBoth([{ model: modelTurn('', [{ id: 'a', args: {} }]), tools: ['a'] }], {
      cycleLimit: 2,
    });
    expectParity(one);
    expect(one.newMessages).toHaveLength(3);
  });

  it('5. matches for guarded / truncated tool content', async () => {
    const result = await runBoth([
      {
        model: modelTurn('', [{ id: 'a', args: {} }]),
        tools: [{ id: 'a', content: '<truncated>', results: [otherResult('a', { big: 'x' })] }],
      },
    ]);
    expectParity(result);
    expect((result.newMessages[1] as ToolMessage).content).toContain('<truncated>');
    expect((result.newMessages[1] as ToolMessage).content).not.toContain('big');
  });

  it('6. matches for the answer phase (handover + answer retry)', async () => {
    const turns: Turn[] = [{ model: modelTurn('', [{ id: 'a', args: {} }]), tools: ['a'] }];
    const regular = await runBoth(turns, {
      answer: {
        handover: { message: 'notes', forceful: false },
        retries: [AgentExecutionErrorCode.emptyResponse],
      },
    });
    expectParity(regular);
    expect(regular.newMessages).toHaveLength(6);

    const forceful = await runBoth(turns, {
      answer: { handover: { message: '', forceful: true }, retries: [] },
    });
    expectParity(forceful);
    expect(forceful.newMessages).toHaveLength(4);
  });

  it('7. matches for a pending (unexecuted) group', async () => {
    const result = await runBoth([
      { model: modelTurn('', [{ id: 'a', args: {} }]), tools: ['a'] },
      { model: modelTurn('pending', [{ id: 'b', args: {} }]) },
    ]);
    expectParity(result);
    expect(result.newMessages).toHaveLength(2);
  });

  const compactingTransformer: ToolCallResultTransformer = async () => [
    { tool_result_id: 'c', type: ToolResultType.other, data: { compacted: true } },
  ];
  const bigTurns = (count: number): Turn[] =>
    Array.from({ length: count }, (_, i) => ({
      model: modelTurn('', [{ id: `c${i}`, args: {} }]),
      tools: [{ id: `c${i}`, results: [otherResult(`c${i}`, { payload: 'x'.repeat(60_000) })] }],
    }));

  it('8. matches for in-flight compaction over the token threshold', async () => {
    const result = await runBoth(bigTurns(4), { resultTransformer: compactingTransformer });
    expectParity(result);
    const toolContents = result.newMessages
      .filter((m) => m.getType() === 'tool')
      .map((m) => m.content as string);
    expect(toolContents.map((c) => c.includes('compacted'))).toEqual([true, true, false, false]);
  });

  it('9. matches for image results with an image resolver', async () => {
    const imageResolver: PromptImageResolver = async ({ attachmentId }) =>
      attachmentId === 'ok' ? { base64: 'AAA', mimeType: 'image/png' } : undefined;
    const result = await runBoth(
      [
        {
          model: modelTurn('', [{ id: 'a', args: {} }]),
          tools: [
            {
              id: 'a',
              results: [
                {
                  tool_result_id: 'img1',
                  type: ToolResultType.image,
                  data: {
                    attachment_id: 'ok',
                    mime_type: 'image/png',
                    name: 'pic',
                    description: '',
                  },
                },
                {
                  tool_result_id: 'img2',
                  type: ToolResultType.image,
                  data: { attachment_id: 'missing', mime_type: 'image/png', description: '' },
                },
              ],
            },
          ],
        },
      ],
      { imageResolver }
    );
    expectParity(result);
    expect(result.newMessages).toHaveLength(4); // ai, tool, failure notice, image message
  });

  it('10. matches for a pending final group under in-flight compaction', async () => {
    const result = await runBoth(
      [...bigTurns(4), { model: modelTurn('', [{ id: 'final', args: {} }]) }],
      { resultTransformer: compactingTransformer }
    );
    expectParity(result);
    const toolContents = result.newMessages
      .filter((m) => m.getType() === 'tool')
      .map((m) => m.content as string);
    // cutoff is 4 - PRESERVED_RECENT_CYCLES, not 5 - ...
    expect(toolContents.map((c) => c.includes('compacted'))).toEqual([true, true, false, false]);
  });

  it('11. matches for an ask_user_question call with invalid arguments', async () => {
    const result = await runBoth([
      {
        model: modelTurn('', [{ id: 'a1', args: { questions: 'nope' }, name: askName }]),
        tools: [
          {
            id: 'a1',
            content: 'Error: Received tool input did not match expected schema',
            artifact: false,
          },
        ],
      },
      { model: modelTurn('', [{ id: 'a2', args: { questions: [] }, name: askName }]) },
    ]);
    expectParity(result);
    expect(result.renderState.a1.kind).toBe('dedicated');
    expect((result.newMessages[1] as ToolMessage).content).toContain('Error:');
  });

  it('renderStepsToMessages without compaction equals renderCurrentRun below the threshold', async () => {
    const { steps, renderState } = await runBoth([
      { model: modelTurn('', [{ id: 'a', args: {} }]), tools: ['a'] },
    ]);
    const mode = {
      type: 'current' as const,
      phase: 'research' as const,
      renderState,
      pendingToolCallIds: [],
      retryNotices: [],
      cycleLimit: 10,
    };
    expect(normalize(await renderCurrentRun({ steps, mode }))).toEqual(
      normalize(await renderStepsToMessages({ steps, mode }))
    );
  });
});
