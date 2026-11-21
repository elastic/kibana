/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionSummary,
  ConversationRoundStep,
  DynamicToolDefinition,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import { isOtherResult } from '@kbn/agent-builder-common/tools';
import { historyView, listVisibleUnits, resolveVisibility, unitSteps } from './context_coverage';
import type { ProcessedConversation } from './prepare_conversation';

/**
 * The ids of the dynamic tools whose definition the model can see: in the `dynamic_tools` field of
 * a tool result the compaction summary does not hide (`load_skill`, or the extra result a SKILL.md
 * read gets), or in the summary's own snapshot.
 *
 * A tool restored from `dynamic_tool_ids` without one would be reachable but undescribed, as for a
 * skill loaded before dynamic tools existed (its `load_skill` result only lists ids): it is left
 * out, and the model loads the skill again when it needs it.
 */
export const describedDynamicToolIds = ({
  conversation,
  compactionSummary,
  roundId,
  resumedSteps = [],
}: {
  conversation: ProcessedConversation;
  compactionSummary?: CompactionSummary;
  /** The round the run executes (a resume: the paused round). */
  roundId: string;
  /** The steps of the paused round a resume continues; left out of the history, so passed apart. */
  resumedSteps?: ConversationRoundStep[];
}): Set<string> => {
  const { entries } = historyView(conversation);
  const visibility = resolveVisibility({
    entries,
    roundId,
    steps: resumedSteps,
    cursor: compactionSummary?.summarized_up_to,
  });

  // The same units the prompt renders, so a described tool is one the model can see.
  const visibleSteps = listVisibleUnits({ entries, steps: resumedSteps, visibility }).flatMap(
    (unit) => unitSteps(unit, resumedSteps)
  );

  const definitions = [
    ...visibleSteps.flatMap(stepToolDefinitions),
    ...(compactionSummary?.dynamic_tools ?? []),
  ];
  return new Set(definitions.map((definition) => definition.tool_id));
};

/** The definitions an `other` result carries in its `dynamic_tools` field, as `load_skill` writes them. */
const stepToolDefinitions = (step: ConversationRoundStep): DynamicToolDefinition[] =>
  isToolCallStep(step)
    ? step.results.filter(isOtherResult).flatMap((result) => {
        const definitions = result.data.dynamic_tools;
        return Array.isArray(definitions) ? definitions.filter(isDynamicToolDefinition) : [];
      })
    : [];

const isDynamicToolDefinition = (value: unknown): value is DynamicToolDefinition =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<DynamicToolDefinition>).tool_id === 'string';
