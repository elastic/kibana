/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionCursor,
  CompactionSummary,
  ConversationRoundStep,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ProcessedRoundInput } from '@kbn/agent-builder-server';
import type { ProcessedConversation } from './prepare_conversation';
import {
  groupTimelineEntries,
  groupTimelineRounds,
  isAwaitingPrompt,
  isTimelineRound,
  type ProcessedTimelineEvent,
  type TimelineEntry,
  type TimelineRound,
  type TimelineStandaloneUserMessage,
} from './context_timeline';
import { coveredRoundIds } from './compaction_coverage';
import { groupToolCallSteps } from './render_steps_to_messages';
import type { ToolRenderStateMap } from '../transient_state';

/** Inclusive index range into a step list. */
export interface StepRange {
  start: number;
  end: number;
}

/**
 * Splits steps into cycles: each cycle ends with the last call of a tool call group. Steps before
 * a group (reasoning, notices) belong to it; steps after the last group join the last cycle. A
 * list without tool calls is a single cycle.
 */
export const groupStepCycles = (steps: ConversationRoundStep[]): StepRange[] => {
  if (steps.length === 0) {
    return [];
  }
  const groupEnds = groupToolCallSteps(steps).map((group) =>
    steps.indexOf(group[group.length - 1])
  );
  if (groupEnds.length === 0) {
    return [{ start: 0, end: steps.length - 1 }];
  }
  groupEnds[groupEnds.length - 1] = steps.length - 1;
  return groupEnds.map((end, index) => ({
    start: index === 0 ? 0 : groupEnds[index - 1] + 1,
    end,
  }));
};

/** The history the agent context renders before the current run, and the input that follows it. */
export interface HistoryView {
  entries: Array<TimelineEntry<ProcessedTimelineEvent>>;
  input: ProcessedRoundInput;
  inputTimestamp?: string;
}

/**
 * A round paused on a prompt is resumed by the current run: it is left out of the history (the
 * graph renders its steps) and its user message stands in for the next input.
 */
export const historyView = (
  conversation: ProcessedConversation,
  conversationTimestamp?: string
): HistoryView => {
  const entries = groupTimelineEntries(conversation.timeline);
  const lastRound = groupTimelineRounds(conversation.timeline).at(-1);
  if (lastRound && isAwaitingPrompt(lastRound)) {
    return {
      entries: entries.filter((entry) => !isTimelineRound(entry) || entry.id !== lastRound.id),
      input: lastRound.userMessage.data,
      inputTimestamp: lastRound.userMessage.created_at,
    };
  }
  return { entries, input: conversation.nextInput, inputTimestamp: conversationTimestamp };
};

/** What a compaction cursor leaves visible. */
export interface ContextVisibility {
  /** Leading history entries fully covered by the summary. */
  hiddenEntryCount: number;
  /** First visible step of the entry at `hiddenEntryCount` (a partially covered round). */
  entryFromStep: number;
  /** First visible step of the current run. */
  currentFromStep: number;
}

export const FULLY_VISIBLE: ContextVisibility = {
  hiddenEntryCount: 0,
  entryFromStep: 0,
  currentFromStep: 0,
};

const findToolCall = (steps: ConversationRoundStep[], toolCallId: string): number =>
  steps.findIndex((step) => isToolCallStep(step) && step.tool_call_id === toolCallId);

const cycleEndingAfter = (steps: ConversationRoundStep[], stepIndex: number) => {
  const cycles = groupStepCycles(steps);
  const index = cycles.findIndex(({ start, end }) => start <= stepIndex && stepIndex <= end);
  return { cycle: cycles[index], isLast: index === cycles.length - 1 };
};

/** Visibility when the cursor ends at step `stepIndex` of the history entry `entryIndex`. */
const coveredThroughRoundStep = (
  round: TimelineRound<ProcessedTimelineEvent>,
  entryIndex: number,
  stepIndex: number
): ContextVisibility => {
  const { cycle, isLast } = cycleEndingAfter(round.steps, stepIndex);
  return isLast
    ? { hiddenEntryCount: entryIndex + 1, entryFromStep: 0, currentFromStep: 0 }
    : { hiddenEntryCount: entryIndex, entryFromStep: cycle.end + 1, currentFromStep: 0 };
};

/**
 * Resolves a cursor against the history and the current run (`roundId`, `steps`). An anchor that
 * cannot be found covers nothing.
 */
export const resolveVisibility = ({
  entries,
  roundId,
  steps,
  cursor,
}: {
  entries: Array<TimelineEntry<ProcessedTimelineEvent>>;
  roundId: string;
  steps: ConversationRoundStep[];
  cursor?: CompactionCursor;
}): ContextVisibility => {
  if (!cursor) {
    return FULLY_VISIBLE;
  }
  if ('event_id' in cursor) {
    for (const [index, entry] of entries.entries()) {
      if (entry.userMessage.id === cursor.event_id) {
        return isTimelineRound(entry)
          ? coveredThroughRoundStep(entry, index, 0)
          : { hiddenEntryCount: index + 1, entryFromStep: 0, currentFromStep: 0 };
      }
      if (isTimelineRound(entry) && entry.terminal.id === cursor.event_id) {
        return { hiddenEntryCount: index + 1, entryFromStep: 0, currentFromStep: 0 };
      }
    }
    return FULLY_VISIBLE;
  }
  if (cursor.round_id === roundId) {
    const stepIndex = findToolCall(steps, cursor.tool_call_id);
    if (stepIndex < 0) {
      return FULLY_VISIBLE;
    }
    const { cycle } = cycleEndingAfter(steps, stepIndex);
    return { hiddenEntryCount: entries.length, entryFromStep: 0, currentFromStep: cycle.end + 1 };
  }
  for (const [index, entry] of entries.entries()) {
    if (isTimelineRound(entry) && entry.id === cursor.round_id) {
      const stepIndex = findToolCall(entry.steps, cursor.tool_call_id);
      return stepIndex >= 0 ? coveredThroughRoundStep(entry, index, stepIndex) : FULLY_VISIBLE;
    }
  }
  return FULLY_VISIBLE;
};

/** A compactable slice of the visible context, in render order. */
export type ContextUnit =
  | {
      kind: 'message';
      entry: TimelineStandaloneUserMessage<ProcessedTimelineEvent>;
    }
  | {
      kind: 'round_cycle';
      round: TimelineRound<ProcessedTimelineEvent>;
      /** Absent for a round without steps. */
      range?: StepRange;
      first: boolean;
      last: boolean;
    }
  | { kind: 'current_cycle'; range: StepRange };

/** The visible context split into units: history cycles, then the current run's cycles. */
export const listVisibleUnits = ({
  entries,
  steps,
  visibility,
}: {
  entries: Array<TimelineEntry<ProcessedTimelineEvent>>;
  steps: ConversationRoundStep[];
  visibility: ContextVisibility;
}): ContextUnit[] => {
  const units: ContextUnit[] = [];
  entries.slice(visibility.hiddenEntryCount).forEach((entry, offset) => {
    if (!isTimelineRound(entry)) {
      units.push({ kind: 'message', entry });
      return;
    }
    const fromStep = offset === 0 ? visibility.entryFromStep : 0;
    const cycles = groupStepCycles(entry.steps);
    if (cycles.length === 0) {
      units.push({ kind: 'round_cycle', round: entry, first: true, last: true });
      return;
    }
    cycles.forEach((range, index) => {
      if (range.start < fromStep) {
        return;
      }
      units.push({
        kind: 'round_cycle',
        round: entry,
        range,
        first: index === 0,
        last: index === cycles.length - 1,
      });
    });
  });
  for (const range of groupStepCycles(steps)) {
    if (range.start >= visibility.currentFromStep) {
      units.push({ kind: 'current_cycle', range });
    }
  }
  return units;
};

export const unitSteps = (
  unit: ContextUnit,
  steps: ConversationRoundStep[]
): ConversationRoundStep[] => {
  if (unit.kind === 'message' || !unit.range) {
    return [];
  }
  const source = unit.kind === 'round_cycle' ? unit.round.steps : steps;
  return source.slice(unit.range.start, unit.range.end + 1);
};

/**
 * The cursor ending at `unit`, from ids that survive re-serialization: its last tool call, else
 * its round's terminal or user message. Current-run calls only qualify when they are persisted
 * (browser and dedicated-lifecycle calls are not), so a cycle of such calls has no anchor.
 */
export const unitAnchor = (
  unit: ContextUnit,
  {
    roundId,
    steps,
    renderState,
  }: { roundId: string; steps: ConversationRoundStep[]; renderState: ToolRenderStateMap }
): CompactionCursor | undefined => {
  if (unit.kind === 'message') {
    return { event_id: unit.entry.userMessage.id };
  }
  const calls = unitSteps(unit, steps).filter(isToolCallStep);
  if (unit.kind === 'current_cycle') {
    const persisted = calls.filter(
      ({ tool_call_id: id }) => (renderState[id]?.kind ?? 'server') === 'server'
    );
    const last = persisted.at(-1);
    return last ? { round_id: roundId, tool_call_id: last.tool_call_id } : undefined;
  }
  const last = calls.at(-1);
  if (last) {
    return { round_id: unit.round.id, tool_call_id: last.tool_call_id };
  }
  return unit.last ? { event_id: unit.round.terminal.id } : { event_id: unit.round.userMessage.id };
};

export const unitToolCalls = (unit: ContextUnit, steps: ConversationRoundStep[]): ToolCallStep[] =>
  unitSteps(unit, steps).filter(isToolCallStep);

/** Round ids a visibility fully covers, in order: the fields older readers interpret a summary by. */
export const fullyCoveredRoundIds = (
  entries: Array<TimelineEntry<ProcessedTimelineEvent>>,
  visibility: ContextVisibility
): string[] =>
  entries
    .slice(0, visibility.hiddenEntryCount)
    .filter(isTimelineRound)
    .map((round) => round.id);

/**
 * Gives a summary written before cycle-based compaction a cursor: the end of the longest prefix of
 * the history made of rounds it covers (main's `covered_round_ids`, or the legacy count). Covered
 * rounds after a gap stay visible — duplicated with the summary rather than lost.
 */
export const translateLegacySummary = ({
  summary,
  entries,
  legacyEligibleIds,
}: {
  summary: CompactionSummary;
  entries: Array<TimelineEntry<ProcessedTimelineEvent>>;
  legacyEligibleIds: ReadonlySet<string>;
}): CompactionSummary => {
  if (summary.summarized_up_to) {
    return summary;
  }
  const rounds = entries.filter(isTimelineRound);
  const covered = coveredRoundIds({ summary, rounds, legacyEligibleIds });
  let lastCovered: TimelineRound<ProcessedTimelineEvent> | undefined;
  for (const entry of entries) {
    if (!isTimelineRound(entry) || !covered.has(entry.id)) {
      break;
    }
    lastCovered = entry;
  }
  return lastCovered
    ? { ...summary, summarized_up_to: { event_id: lastCovered.terminal.id } }
    : summary;
};
