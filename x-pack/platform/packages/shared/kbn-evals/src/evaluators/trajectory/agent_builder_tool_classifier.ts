/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInternalToolKind, isInProtectedNamespace } from '@kbn/agent-builder-common';
import type { Evaluator, TaskOutput } from '../../types';
import { getToolCallSteps } from '../../utils/evaluation_helpers';
import type { ToolCallClass, TrajectoryToolCall } from '.';

/** Tool calls of an Agent Builder converse output, with the origin the runtime recorded. */
export const getAgentBuilderToolCalls = (output: unknown): TrajectoryToolCall[] =>
  getToolCallSteps(output as TaskOutput).flatMap(({ tool_id: id, tool_origin: origin }) =>
    id ? [{ id, ...(origin && { origin }) }] : []
  );

/**
 * Classifies Agent Builder tool calls for {@link createTrajectoryEvaluator} using Agent Builder's
 * own exports, so a tool Agent Builder adds later can never silently change a trajectory score:
 * 1. internal tools Agent Builder marks as `runtime` (attachments, todos, skill loading, ...) are
 *    dropped; those marked `data_access` (files, shell, APIs, sub-agents) are scored.
 * 2. a call the runtime reports as `registry` or `inline` is a domain tool and is scored.
 * 3. a call the runtime reports as `internal` that Agent Builder does not classify is unknown.
 * 4. without an origin (trace spans carry none): ids in a protected namespace are built-in domain
 *    tools, and `knownToolIds` (e.g. custom tools the suite registers) are scored.
 * Anything else is `unclassified`, which makes the trajectory N/A instead of a score.
 *
 * `knownToolIds` only applies on the trace path (no origin); it never rescues a call the runtime
 * tags `internal`. Browser API tools are registered with origin `internal` (run_chat_agent.ts), so
 * on the conversation path they come back unclassified (N/A).
 *
 * An unclassified call makes the result N/A even when a golden tool was missed. That is by design:
 * the trajectory is unmeasured until the tool is classified.
 */
export const createAgentBuilderToolClassifier = ({
  knownToolIds = [],
}: { knownToolIds?: Iterable<string> } = {}) => {
  const known = new Set(knownToolIds);
  return (call: TrajectoryToolCall): ToolCallClass => {
    const kind = getInternalToolKind(call.id);
    if (kind === 'runtime') {
      return 'runtime';
    }
    if (kind === 'data_access') {
      return 'scored';
    }
    if (call.origin === 'registry' || call.origin === 'inline') {
      return 'scored';
    }
    if (call.origin === 'internal') {
      return 'unclassified';
    }
    if (isInProtectedNamespace(call.id) || known.has(call.id)) {
      return 'scored';
    }
    return 'unclassified';
  };
};

/**
 * Reports how many distinct tools in a run the classifier could not place. Scored per example
 * (lower is better), so a rising rate of unmeasured trajectories shows in the run summary.
 */
export const createUnclassifiedToolsEvaluator = ({
  extractToolCalls,
  classifyTool,
  goldenPathExtractor,
}: {
  extractToolCalls: (output: unknown) => Array<string | TrajectoryToolCall>;
  classifyTool: (call: TrajectoryToolCall) => ToolCallClass;
  /** Same extractor as the trajectory evaluator: golden tools are exempt from classification. */
  goldenPathExtractor?: (expected: unknown) => string[];
}): Evaluator => ({
  name: 'unclassified-tools',
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output, expected }) => {
    const golden = new Set(goldenPathExtractor?.(expected) ?? []);
    const ids = [
      ...new Set(
        extractToolCalls(output)
          .map((call) => (typeof call === 'string' ? { id: call } : call))
          .filter((call) => !golden.has(call.id) && classifyTool(call) === 'unclassified')
          .map((call) => call.id)
      ),
    ];
    return {
      score: ids.length,
      explanation: ids.length === 0 ? 'All tool calls classified.' : ids.join(', '),
      metadata: { unclassifiedToolIds: ids },
    };
  },
});
