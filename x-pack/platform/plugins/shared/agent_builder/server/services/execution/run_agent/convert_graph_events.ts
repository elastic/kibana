/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { OperatorFunction } from 'rxjs';
import { EMPTY, mergeMap, of } from 'rxjs';
import type { BackgroundAgentCompleteStep, ChatAgentEvent } from '@kbn/agent-builder-common/chat';
import {
  isBackgroundAgentCompleteStep,
  isReasoningStep,
  isSubagentRosterUpdatedStep,
} from '@kbn/agent-builder-common/chat';
import {
  createBrowserToolCallEvent,
  createMessageEvent,
  createPromptRequestEvent,
  createReasoningEvent,
  createTextChunkEvent,
  createThinkingCompleteEvent,
  createBackgroundAgentCompleteEvent,
  createSubagentRosterUpdatedEvent,
  createToolCallEvent,
  createToolResultEvent,
  extractTextContent,
  hasTag,
  matchEvent,
  matchGraphName,
  matchName,
} from '@kbn/agent-builder-genai-utils/langchain';
import type { Logger } from '@kbn/logging';
import { AgentPromptRequestSourceType } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents/prompts';
import { createUserQuestionAskedEvent } from '@kbn/agent-builder-common/chat';
import type { StateType } from './state';
import { steps, tags } from './constants';
import type { RunStepUpdate } from './step_state';
import type { ResearchOutcome, ToolOutcome, ToolRenderStateUpdate } from './transient_state';

/** What a `researchAgent` node returns, as seen on its `on_chain_end` event. */
interface ResearchNodeOutput {
  steps?: RunStepUpdate[];
  toolRenderState?: ToolRenderStateUpdate;
  researchOutcome?: ResearchOutcome;
}

/** What an `executeTool` node returns, as seen on its `on_chain_end` event. */
interface ExecuteToolNodeOutput {
  steps?: RunStepUpdate[];
  toolOutcome?: ToolOutcome;
}

/**
 * Reasoning and tool call events for the step updates emitted by a research turn. Dedicated-lifecycle
 * calls (e.g. ask_user_question) have no `tool_call` event: their lifecycle is the prompt request.
 */
const stepUpdatesToEvents = (
  updates: RunStepUpdate[],
  renderState: ToolRenderStateUpdate
): ChatAgentEvent[] => {
  const events: ChatAgentEvent[] = [];
  for (const update of updates) {
    if (update.type === 'append' && isReasoningStep(update.step)) {
      events.push(
        createReasoningEvent(update.step.reasoning, {
          toolCallId: update.step.tool_call_id,
          toolCallGroupId: update.step.tool_call_group_id,
        })
      );
    } else if (update.type === 'append_tool_call') {
      const { step } = update;
      const kind = renderState[step.tool_call_id]?.kind ?? 'server';
      if (kind === 'browser') {
        events.push(
          createBrowserToolCallEvent({
            toolId: step.tool_id,
            toolCallId: step.tool_call_id,
            params: step.params,
          })
        );
      } else if (kind === 'server') {
        events.push(
          createToolCallEvent({
            toolId: step.tool_id,
            toolCallId: step.tool_call_id,
            params: step.params,
            toolCallGroupId: step.tool_call_group_id,
            toolOrigin: step.tool_origin,
            toolType: step.tool_type,
          })
        );
      }
    }
  }
  return events;
};

const stripStepType = ({ type, ...execution }: BackgroundAgentCompleteStep) => execution;

const NODE_NAMES: ReadonlySet<string> = new Set(Object.values(steps));

/**
 * True for the `on_chain_end` of one of *our* nodes running in the *root* graph of this run.
 * Node names are reused by nested graphs (tool-internal graphs have their own names) and inherited
 * metadata is not enough to tell them apart, so this checks:
 * - `metadata.graphName`,
 * - `event.name === metadata.langgraph_node` (the node's own run, not a runnable inside it — the
 *   same test LangGraph uses in its stream handlers),
 * - a single-segment `langgraph_checkpoint_ns`: LangGraph joins nested namespaces with `|`, so a
 *   graph invoked under one of our nodes whose events reach this stream through inherited callbacks
 *   shows up as `parent|child`. Our own nodes are always single-segment, including inside a
 *   sub-agent run (`run_chat_agent` resets the inherited namespace when it streams the graph), so
 *   this check cannot tell a sub-agent's nodes from the parent's: a sub-agent's events are kept off
 *   the parent's stream by `callbacks: []`, not by this check.
 */
const isRootGraphNodeEnd = (event: LangchainStreamEvent, graphName: string): boolean => {
  if (event.event !== 'on_chain_end' || !NODE_NAMES.has(event.name)) return false;
  if (!matchGraphName(event, graphName)) return false;
  const { langgraph_node: node, langgraph_checkpoint_ns: namespace } = event.metadata ?? {};
  if (node !== event.name) return false;
  return typeof namespace !== 'string' || !namespace.includes('|');
};

export const convertGraphEvents = ({
  graphName,
  logger,
  startTime,
  structuredOutput,
}: {
  graphName: string;
  logger: Logger;
  startTime: Date;
  structuredOutput: boolean;
}): OperatorFunction<LangchainStreamEvent, ChatAgentEvent> => {
  return (streamEvents$) => {
    // message identifier for emitted chunks
    let messageId = uuidv4();

    // Tracks the timestamp of the first text chunk of the current research turn.
    // Used to backdate `thinkingCompleteEvent` to the first chunk of the terminal turn
    let currentTurnFirstChunkAt: number | undefined;

    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // reset per-turn first-chunk tracker at the start of each research turn
        if (matchEvent(event, 'on_chain_start') && matchName(event, steps.researchAgent)) {
          // reset per-turn first-chunk tracker at the start of each research turn
          currentTurnFirstChunkAt = undefined;
          // reset message id between research turns
          messageId = uuidv4();
          return EMPTY;
        }

        // streaming text chunks for the UI (answering + research)
        if (
          matchEvent(event, 'on_chat_model_stream') &&
          (hasTag(event, tags.answerAgent) || hasTag(event, tags.researchAgent))
        ) {
          const chunk: AIMessageChunk = event.data.chunk;
          const textContent = extractTextContent(chunk);
          if (textContent) {
            if (
              !structuredOutput &&
              hasTag(event, tags.researchAgent) &&
              currentTurnFirstChunkAt === undefined
            ) {
              currentTurnFirstChunkAt = Date.now();
            }
            return of(createTextChunkEvent(textContent, { messageId }));
          }
        }

        // emit reasoning and tool call events for research agent turns
        if (isRootGraphNodeEnd(event, graphName) && matchName(event, steps.researchAgent)) {
          const output = event.data.output as ResearchNodeOutput;
          const events: ChatAgentEvent[] = stepUpdatesToEvents(
            output.steps ?? [],
            output.toolRenderState ?? {}
          );

          // Backdated thinking-complete: when the research agent's terminal turn
          // is a handover in non-structured mode, emit thinkingCompleteEvent with
          // the timestamp of the first chunk of that turn. Falls back to "now" if
          // no chunk timestamp was captured.
          if (!structuredOutput && output.researchOutcome?.type === 'handover') {
            const firstChunkOffset =
              currentTurnFirstChunkAt !== undefined
                ? currentTurnFirstChunkAt - startTime.getTime()
                : Date.now() - startTime.getTime();
            events.push(createThinkingCompleteEvent(firstChunkOffset));
          }

          return of(...events);
        }

        // emit messageEvent at finalize: state.finalAnswer is the canonical answer
        // (string for non-structured, object for structured)
        if (isRootGraphNodeEnd(event, graphName) && matchName(event, steps.finalize)) {
          const finalState = event.data.output as StateType;
          const finalAnswer = finalState.finalAnswer;
          if (finalAnswer !== undefined && finalAnswer !== null && finalAnswer !== '') {
            return of(createMessageEvent(finalAnswer, { messageId }));
          }
          return EMPTY;
        }

        // emit tool result events and/or prompt request events
        if (isRootGraphNodeEnd(event, graphName) && matchName(event, steps.executeTool)) {
          const output = event.data.output as ExecuteToolNodeOutput;
          const updates = output.steps ?? [];
          const resultEvents: ChatAgentEvent[] = [];

          for (const update of updates) {
            if (update.type === 'resolve_tool_call') {
              resultEvents.push(
                createToolResultEvent({
                  toolCallId: update.toolCallId,
                  toolId: update.toolId,
                  results: update.results,
                })
              );
            }
          }

          if (output.toolOutcome?.type === 'interrupted') {
            for (const { prompt, toolCallId } of output.toolOutcome.prompts) {
              resultEvents.push(
                createPromptRequestEvent({
                  prompt,
                  source: {
                    type: AgentPromptRequestSourceType.toolCall,
                    tool_call_id: toolCallId,
                  },
                })
              );

              if (isAskUserQuestionPrompt(prompt)) {
                resultEvents.push(
                  createUserQuestionAskedEvent({
                    prompt_id: prompt.id,
                    questions: prompt.questions,
                  })
                );
              }
            }
          }

          for (const update of updates) {
            if (update.type === 'append' && isSubagentRosterUpdatedStep(update.step)) {
              resultEvents.push(createSubagentRosterUpdatedEvent(update.step.roster));
            }
          }

          if (resultEvents.length > 0) {
            return of(...resultEvents);
          }
        }

        // emit background execution complete events
        if (isRootGraphNodeEnd(event, graphName) && matchName(event, steps.checkBackgroundWork)) {
          const output = event.data.output as { steps?: RunStepUpdate[] };
          const bgEvents: ChatAgentEvent[] = [];

          for (const update of output.steps ?? []) {
            if (update.type === 'append' && isBackgroundAgentCompleteStep(update.step)) {
              bgEvents.push(createBackgroundAgentCompleteEvent(stripStepType(update.step)));
            }
          }

          if (bgEvents.length > 0) {
            return of(...bgEvents);
          }
        }

        return EMPTY;
      })
    );
  };
};
