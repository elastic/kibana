/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import {
  extractOrderedToolCalls,
  extractToolCallIds,
  isToolId,
  memoryToolIds,
  summarizePersistenceCalls,
} from '../../utils/tool_usage';
import {
  alreadyRecordedNoiseUuids,
  eventWriteSignalRuleUuids,
} from '../../utils/already_recorded_noise';
import type { DiscoveryEvaluator } from '../../types';
import type {
  ContinuationCycle,
  ContinuationEvaluator,
} from '../continuation/continuation_stability';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  eventsWrite: TOOL_ID_EVENTS_WRITE,
} = platformSignificantEventsTools;

const {
  memorySearch: TOOL_ID_MEMORY_SEARCH,
  memoryRead: TOOL_ID_MEMORY_READ,
  memoryPatch: TOOL_ID_MEMORY_PATCH,
  memoryWrite: TOOL_ID_MEMORY_WRITE,
} = memoryToolIds;

export interface ToolUsageScore {
  score: number;
  label: string;
  explanation: string;
}

const isTool = isToolId;

const calledCanonical = (calledTools: Set<string>, canonical: string): boolean =>
  [...calledTools].some((toolId) => isTool(toolId, canonical));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasSchemaValidationFailure = ({
  results,
}: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  results.some(
    (result) =>
      isRecord(result) &&
      isRecord(result.data) &&
      typeof result.data.message === 'string' &&
      result.data.message.includes('Received tool input did not match expected schema')
  );

const hasCompletedItems = ({
  params,
}: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  Array.isArray(params.items) && params.items.length > 0;

const isSerializationRecovery = (
  eventWrites: Array<ReturnType<typeof extractOrderedToolCalls>[number]>
): boolean => {
  const [failedWrite, recoveredWrite] = eventWrites;
  return (
    eventWrites.length === 2 &&
    failedWrite !== undefined &&
    !hasCompletedItems(failedWrite) &&
    recoveredWrite !== undefined &&
    hasCompletedItems(recoveredWrite) &&
    !hasSchemaValidationFailure(recoveredWrite)
  );
};

const findDuplicateEventWriteRule = (
  eventWrites: Array<ReturnType<typeof extractOrderedToolCalls>[number]>
): { ruleUuid: string; firstItemIndex: number; secondItemIndex: number } | undefined => {
  const ruleOwners = new Map<string, number>();

  for (const { params } of eventWrites) {
    if (!Array.isArray(params.items)) {
      continue;
    }
    for (const [itemIndex, item] of params.items.entries()) {
      if (!isRecord(item) || !Array.isArray(item.signals)) {
        continue;
      }
      for (const signal of item.signals) {
        if (!isRecord(signal) || !isRecord(signal.metadata)) {
          continue;
        }
        const ruleUuid = signal.metadata.rule_uuid;
        if (typeof ruleUuid !== 'string') {
          continue;
        }
        const firstItemIndex = ruleOwners.get(ruleUuid);
        if (firstItemIndex !== undefined) {
          return { ruleUuid, firstItemIndex, secondItemIndex: itemIndex };
        }
        ruleOwners.set(ruleUuid, itemIndex);
      }
    }
  }
};

/** Require events_write and reject workflow-owned discovery stamping. */
const scoreOutputTool = (
  calledTools: Set<string>,
  steps: ConverseStep[]
): ToolUsageScore | null => {
  if (!calledCanonical(calledTools, TOOL_ID_EVENTS_WRITE)) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_EVENTS_WRITE}`,
      explanation: `${TOOL_ID_EVENTS_WRITE} was not called — required to persist the decision`,
    };
  }

  const eventWrites = extractOrderedToolCalls(steps).filter(({ toolId }) =>
    isTool(toolId, TOOL_ID_EVENTS_WRITE)
  );
  const duplicateRule = findDuplicateEventWriteRule(eventWrites);
  if (duplicateRule) {
    return {
      score: 0,
      label: 'duplicate-rule-across-items',
      explanation: `${TOOL_ID_EVENTS_WRITE} assigns rule UUID ${duplicateRule.ruleUuid} to items ${duplicateRule.firstItemIndex} and ${duplicateRule.secondItemIndex}; merge those components before writing`,
    };
  }
  const schemaFailureIndex = eventWrites.findIndex(hasSchemaValidationFailure);
  if (schemaFailureIndex !== -1) {
    if (schemaFailureIndex === 0 && isSerializationRecovery(eventWrites)) {
      return null;
    }

    const retriedAfterSchemaFailure = eventWrites.length > schemaFailureIndex + 1;
    return {
      score: 0,
      label: retriedAfterSchemaFailure
        ? 'events-write-schema-validation-retry'
        : 'events-write-schema-validation-failure',
      explanation: retriedAfterSchemaFailure
        ? `${TOOL_ID_EVENTS_WRITE} retried after a schema-validation failure instead of correcting ownership before its single write`
        : `${TOOL_ID_EVENTS_WRITE} rejected the completed payload during schema validation`,
    };
  }

  const invalidWrite = eventWrites.some(
    ({ params, toolId }) =>
      isTool(toolId, TOOL_ID_EVENTS_WRITE) &&
      (!Array.isArray(params.items) || params.items.length === 0)
  );
  if (invalidWrite) {
    return {
      score: 0,
      label: 'invalid-events-write-payload',
      explanation: `${TOOL_ID_EVENTS_WRITE} requires a non-empty items array`,
    };
  }

  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_EVENTS_WRITE);
  if (!persistenceCalls.valid) {
    return {
      score: 0.75,
      label: `multiple-${TOOL_ID_EVENTS_WRITE}-calls`,
      explanation: `${TOOL_ID_EVENTS_WRITE} was called ${persistenceCalls.count} times without one justified partial-failure retry`,
    };
  }
  return null;
};

const didRuleSearchReturnNoCandidates = ({
  params,
  results,
  toolId,
}: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  isTool(toolId, TOOL_ID_EVENT_SEARCH) &&
  Array.isArray(params.rule_uuids) &&
  params.rule_uuids.length > 0 &&
  results.some(
    (result) =>
      isRecord(result) &&
      isRecord(result.data) &&
      (result.data.total === 0 ||
        (Array.isArray(result.data.events) && result.data.events.length === 0))
  );

const writesTopology = ({ params, toolId }: ReturnType<typeof extractOrderedToolCalls>[number]) =>
  isTool(toolId, TOOL_ID_EVENTS_WRITE) &&
  Array.isArray(params.items) &&
  params.items.some(
    (item) =>
      isRecord(item) &&
      ((Array.isArray(item.causal_features) && item.causal_features.length > 0) ||
        (Array.isArray(item.blast_radius) && item.blast_radius.length > 0))
  );

const isGapsMemoryHit = (item: unknown): boolean => {
  if (!isRecord(item)) {
    return false;
  }
  const name = typeof item.name === 'string' ? item.name : '';
  const categories = Array.isArray(item.categories) ? item.categories : [];
  return (
    name.startsWith('_gaps/') ||
    categories.some(
      (category) =>
        typeof category === 'string' &&
        (category === '_system/gaps' || category.startsWith('_system/gaps'))
    )
  );
};

const hasRelevantMemorySearchHits = (calls: ReturnType<typeof extractOrderedToolCalls>): boolean =>
  calls.some(({ results, toolId }) => {
    if (!isTool(toolId, TOOL_ID_MEMORY_SEARCH)) {
      return false;
    }
    return results.some((result) => {
      if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.items)) {
        return false;
      }
      return result.data.items.some((item) => !isGapsMemoryHit(item));
    });
  });

const usesStreamCategoryFilter = (params: Record<string, unknown>): boolean =>
  Array.isArray(params.categories) &&
  params.categories.some(
    (category) => typeof category === 'string' && category.startsWith('streams/')
  );

const getWriteItemResults = (results: unknown[]): Array<Record<string, unknown>> =>
  results.flatMap((result) =>
    isRecord(result) && isRecord(result.data) && Array.isArray(result.data.results)
      ? result.data.results.filter(isRecord)
      : []
  );

const hasChangedWriteItem = (call: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  getWriteItemResults(call.results).some((item) => item.written === true);

const isSuccessfulToolResult = (result: unknown): boolean =>
  isRecord(result) &&
  isRecord(result.data) &&
  typeof result.data.error !== 'string' &&
  typeof result.data.message !== 'string';

const hasSuccessfulPostReadConfirmation = (
  orderedCalls: ReturnType<typeof extractOrderedToolCalls>
): boolean => {
  const readIndex = orderedCalls.findIndex(
    ({ results, toolId }) =>
      isTool(toolId, TOOL_ID_MEMORY_READ) &&
      results.some((result) => isSuccessfulToolResult(result))
  );
  if (readIndex === -1) return false;
  return orderedCalls.some(
    ({ results, toolId }, index) =>
      index > readIndex &&
      isTool(toolId, TOOL_ID_EXECUTE_ESQL) &&
      results.some((result) => isSuccessfulToolResult(result))
  );
};

const onlyWritesUnchangedOutcomes = (
  eventWrites: ReturnType<typeof extractOrderedToolCalls>
): boolean =>
  eventWrites.length > 0 &&
  eventWrites.every(({ results }) => {
    const items = getWriteItemResults(results);
    return (
      items.length > 0 &&
      items.every((item) => item.written === false && item.reason === 'unchanged_outcome')
    );
  });

const scoreMemoryUsage = (
  orderedCalls: ReturnType<typeof extractOrderedToolCalls>,
  { skipWriteBackPositionGates = false }: { skipWriteBackPositionGates?: boolean } = {}
): ToolUsageScore | null => {
  const memorySearchIndex = orderedCalls.findIndex(({ toolId }) =>
    isTool(toolId, TOOL_ID_MEMORY_SEARCH)
  );
  if (memorySearchIndex === -1) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_MEMORY_SEARCH}`,
      explanation: `${TOOL_ID_MEMORY_SEARCH} was not called before grounding`,
    };
  }

  const firstGroundingIndex = orderedCalls.findIndex(
    ({ toolId }) => isTool(toolId, TOOL_ID_KI_SEARCH) || isTool(toolId, TOOL_ID_EXECUTE_ESQL)
  );
  if (firstGroundingIndex !== -1 && memorySearchIndex > firstGroundingIndex) {
    return {
      score: 0,
      label: 'memory-search-after-grounding',
      explanation: `${TOOL_ID_MEMORY_SEARCH} must precede KI search and ES|QL grounding`,
    };
  }

  // Positions within orderedCalls, not the step-space `index` field — live traces interleave
  // non-tool_call steps, which would shift a step-space comparison against findIndex results.
  const searchesBeforeGrounding = orderedCalls.filter(
    ({ toolId }, position) =>
      isTool(toolId, TOOL_ID_MEMORY_SEARCH) &&
      (firstGroundingIndex === -1 || position < firstGroundingIndex)
  );
  if (searchesBeforeGrounding.length > 1) {
    return {
      score: 0,
      label: 'multiple-memory-search-before-grounding',
      explanation: `${TOOL_ID_MEMORY_SEARCH} must run once for the whole batch, not once per rule_uuid`,
    };
  }

  const memorySearch = orderedCalls[memorySearchIndex];
  if (usesStreamCategoryFilter(memorySearch.params)) {
    return {
      score: 0,
      label: 'memory-search-stream-category-filter',
      explanation:
        'Memory search must not filter to streams/<stream_name>; topical wiki pages are not tagged that way',
    };
  }

  if (hasRelevantMemorySearchHits(orderedCalls)) {
    const memoryReads = orderedCalls.filter(({ toolId }) => isTool(toolId, TOOL_ID_MEMORY_READ));
    if (memoryReads.length > 3) {
      return {
        score: 0,
        label: 'memory-read-budget-exceeded',
        explanation: `${TOOL_ID_MEMORY_READ} may read at most three relevant pages per batch`,
      };
    }
    const memoryReadIndex = orderedCalls.findIndex(({ toolId }) =>
      isTool(toolId, TOOL_ID_MEMORY_READ)
    );
    if (memoryReadIndex === -1) {
      return {
        score: 0,
        label: `missing-${TOOL_ID_MEMORY_READ}`,
        explanation: `${TOOL_ID_MEMORY_READ} was not called after memory search returned hits`,
      };
    }
    if (firstGroundingIndex !== -1 && memoryReadIndex > firstGroundingIndex) {
      return {
        score: 0,
        label: 'memory-read-after-grounding',
        explanation: `${TOOL_ID_MEMORY_READ} must finish and classify detections before KI search or ES|QL`,
      };
    }
    const groundingGroupIds = new Set(
      orderedCalls
        .filter(
          ({ groupId, toolId }) =>
            groupId && (isTool(toolId, TOOL_ID_KI_SEARCH) || isTool(toolId, TOOL_ID_EXECUTE_ESQL))
        )
        .map(({ groupId }) => groupId)
    );
    if (
      groundingGroupIds.size > 0 &&
      orderedCalls.some(
        ({ groupId, toolId }) =>
          isTool(toolId, TOOL_ID_MEMORY_READ) && groupId && groundingGroupIds.has(groupId)
      )
    ) {
      return {
        score: 0,
        label: 'memory-read-batched-with-grounding',
        explanation: `${TOOL_ID_MEMORY_READ} must not share a tool-call batch with KI search or ES|QL`,
      };
    }
  }

  const eventsWriteIndex = orderedCalls.findIndex(({ toolId }) =>
    isTool(toolId, TOOL_ID_EVENTS_WRITE)
  );

  // memory_write is allowed only to CREATE a first-sight chronic/noise page. Writing a name the
  // memory search already returned is an overwrite of a known page — that must go through
  // memory_patch instead.
  const searchHitIdentifiers = new Set<string>();
  for (const { results, toolId } of orderedCalls) {
    if (!isTool(toolId, TOOL_ID_MEMORY_SEARCH)) continue;
    for (const result of results) {
      if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.items)) {
        continue;
      }
      for (const item of result.data.items) {
        if (!isRecord(item)) continue;
        if (typeof item.id === 'string') searchHitIdentifiers.add(item.id);
        if (typeof item.name === 'string') searchHitIdentifiers.add(item.name);
      }
    }
  }
  const memoryCreateIndex = orderedCalls.findIndex(({ toolId }) =>
    isTool(toolId, TOOL_ID_MEMORY_WRITE)
  );
  if (memoryCreateIndex !== -1) {
    const writeName = orderedCalls[memoryCreateIndex].params.name;
    if (typeof writeName === 'string' && searchHitIdentifiers.has(writeName)) {
      return {
        score: 0,
        label: 'unexpected-memory-write',
        explanation: `${TOOL_ID_MEMORY_WRITE} overwrites an existing page; Discovery write-back to a known page must use ${TOOL_ID_MEMORY_PATCH}`,
      };
    }
  }

  const isDestructivePatchOp = (op: unknown): boolean =>
    isRecord(op) &&
    (typeof op.old_text === 'string' ||
      (typeof op.heading === 'string' && typeof op.content === 'string') ||
      op.append === '');
  if (
    orderedCalls.some(
      ({ params, toolId }) =>
        isTool(toolId, TOOL_ID_MEMORY_PATCH) &&
        Array.isArray(params.operations) &&
        params.operations.some(isDestructivePatchOp)
    )
  ) {
    return {
      score: 0,
      label: 'destructive-memory-patch',
      explanation: `${TOOL_ID_MEMORY_PATCH} must append under a heading; old_text or heading+content replaces existing page body`,
    };
  }

  const patchedPages = new Set<string>();
  for (const { params, toolId } of orderedCalls) {
    if (!isTool(toolId, TOOL_ID_MEMORY_PATCH)) {
      continue;
    }
    const page =
      typeof params.id === 'string'
        ? params.id
        : typeof params.name === 'string'
        ? params.name
        : '';
    if (page && patchedPages.has(page)) {
      return {
        score: 0,
        label: 'memory-patch-budget-exceeded',
        explanation: `${TOOL_ID_MEMORY_PATCH} may patch a page only once per discovery batch`,
      };
    }
    if (page) patchedPages.add(page);
  }

  // Patch and first-sight create share the same position gates: after an events_write that
  // actually wrote at least one item.
  const writeBackIndexes = [
    orderedCalls.findIndex(({ toolId }) => isTool(toolId, TOOL_ID_MEMORY_PATCH)),
    memoryCreateIndex,
  ].filter((index) => index !== -1);
  const memoryWriteBackIndex = writeBackIndexes.length > 0 ? Math.min(...writeBackIndexes) : -1;
  if (memoryWriteBackIndex !== -1 && !skipWriteBackPositionGates) {
    if (eventsWriteIndex === -1 || memoryWriteBackIndex < eventsWriteIndex) {
      return {
        score: 0,
        label: 'memory-write-before-events-write',
        explanation: 'Memory patch must follow a changed events_write',
      };
    }
    const writesBeforePatch = orderedCalls.filter(
      ({ toolId }, position) =>
        isTool(toolId, TOOL_ID_EVENTS_WRITE) && position < memoryWriteBackIndex
    );
    // Per-item inspection: a mixed batch with one written item is a changed write, and a batch
    // that only failed (bulk_error / existing_active_event) never justifies a write-back.
    if (!writesBeforePatch.some(hasChangedWriteItem)) {
      if (onlyWritesUnchangedOutcomes(writesBeforePatch)) {
        return {
          score: 0,
          label: 'memory-write-after-unchanged-outcome',
          explanation: 'An unchanged continuation must not create or update memory',
        };
      }
      return {
        score: 0,
        label: 'memory-write-without-changed-write',
        explanation: 'Memory patch must follow an events_write with at least one written item',
      };
    }
  }

  return null;
};

export const scoreToolUsage = ({
  steps,
  detectionCount,
  inputRuleUuids = [],
  allowNewEventTopologyWrite = false,
}: {
  steps: ConverseStep[];
  detectionCount: number;
  /** Batch `rule_uuid`s — used to detect already-recorded-noise early-exit. */
  inputRuleUuids?: string[];
  /** When true, skip the topology-search requirement after a zero-result rule search (new episode). */
  allowNewEventTopologyWrite?: boolean;
}): ToolUsageScore => {
  const calledTools = new Set(extractToolCallIds(steps));

  if (detectionCount === 0) {
    return calledTools.size === 0
      ? { score: 1, label: 'correct', explanation: 'Empty batch: no tool calls made as expected' }
      : {
          score: 0,
          label: 'unexpected-tools',
          explanation: `Empty batch: agent made ${calledTools.size} unexpected tool call(s) instead of early-exiting`,
        };
  }

  const orderedCalls = extractOrderedToolCalls(steps);
  const recordedNoise = alreadyRecordedNoiseUuids(orderedCalls, inputRuleUuids);
  const allRecordedNoise =
    inputRuleUuids.length > 0 && inputRuleUuids.every((uuid) => recordedNoise.has(uuid));
  const hasNoiseConfirmation = hasSuccessfulPostReadConfirmation(orderedCalls);

  if (calledCanonical(calledTools, TOOL_ID_EVENTS_WRITE)) {
    const outputCheck = scoreOutputTool(calledTools, steps);
    if (outputCheck) {
      return outputCheck;
    }
    if (allRecordedNoise && hasNoiseConfirmation) {
      return {
        score: 0,
        label: 'already-recorded-noise-wrote-event',
        explanation: 'Already-recorded-noise must skip events_write after the confirmation query',
      };
    }
    const leaked = [...recordedNoise].filter((uuid) =>
      eventWriteSignalRuleUuids(orderedCalls).has(uuid)
    );
    if (leaked.length > 0) {
      return {
        score: 0,
        label: 'already-recorded-noise-wrote-event',
        explanation: `Already-recorded-noise rule_uuid(s) must not appear on events_write: ${leaked.join(
          ', '
        )}`,
      };
    }
  } else if (!allRecordedNoise || !hasNoiseConfirmation) {
    const outputCheck = scoreOutputTool(calledTools, steps);
    if (outputCheck) {
      return outputCheck;
    }
  }

  const memoryCheck = scoreMemoryUsage(orderedCalls, {
    skipWriteBackPositionGates: allRecordedNoise,
  });
  if (memoryCheck) {
    return memoryCheck;
  }

  if (
    allRecordedNoise &&
    orderedCalls.some(
      ({ toolId }) => isTool(toolId, TOOL_ID_MEMORY_PATCH) || isTool(toolId, TOOL_ID_MEMORY_WRITE)
    )
  ) {
    return {
      score: 0,
      label: 'already-recorded-noise-patched',
      explanation: 'Already-recorded-noise must not patch or overwrite memory',
    };
  }

  const hasQueryKiSearch = orderedCalls.some(
    ({ toolId, params }) =>
      isTool(toolId, TOOL_ID_KI_SEARCH) &&
      Array.isArray(params.kind) &&
      params.kind.includes('query')
  );
  if (!hasQueryKiSearch) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_KI_SEARCH}`,
      explanation: `${TOOL_ID_KI_SEARCH} was not called`,
    };
  }

  const ruleSearchFoundNoCandidates = orderedCalls.some(didRuleSearchReturnNoCandidates);
  const hasTopologySearch = orderedCalls.some(
    ({ params, toolId }) =>
      isTool(toolId, TOOL_ID_EVENT_SEARCH) &&
      Array.isArray(params.topology_feature_ids) &&
      params.topology_feature_ids.length > 0
  );
  if (
    !(allowNewEventTopologyWrite && !ruleSearchFoundNoCandidates) &&
    !allRecordedNoise &&
    ruleSearchFoundNoCandidates &&
    orderedCalls.some(writesTopology) &&
    !hasTopologySearch
  ) {
    return {
      score: 0,
      label: 'missing-topology-search',
      explanation:
        'A rule-filtered event search returned no candidates, but the agent wrote topology-bearing event data without running the required topology-filtered event search',
    };
  }

  const expected = [
    TOOL_ID_MEMORY_SEARCH,
    TOOL_ID_EXECUTE_ESQL,
    TOOL_ID_KI_SEARCH,
    ...(allRecordedNoise && hasNoiseConfirmation ? [] : [TOOL_ID_EVENT_SEARCH]),
  ];
  const missing = expected.filter((t) => !calledCanonical(calledTools, t));
  const score = (expected.length - missing.length) / expected.length;
  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_EVENTS_WRITE);
  return {
    score,
    label: missing.length === 0 ? 'correct' : `missing-${missing.join('-')}`,
    explanation:
      score === 1
        ? allRecordedNoise && hasNoiseConfirmation
          ? 'Correctly confirmed already-recorded-noise and skipped events_write'
          : persistenceCalls.retriedPartialFailure
          ? 'Correctly called all tools and retried only failed event items'
          : persistenceCalls.retriedSchemaFailure
          ? 'Correctly called all tools and retried after a schema or tool error'
          : 'Correctly called all tools'
        : `Missing tools: ${missing.join(', ')}`,
  };
};

export const createDiscoveryToolUsageEvaluator = (): DiscoveryEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ input, output }) => {
    const detections = output.inputDetections ?? input.detections ?? [];
    return Promise.resolve(
      scoreToolUsage({
        steps: output.steps ?? [],
        detectionCount: detections.length,
        inputRuleUuids: detections
          .map((detection) => detection.rule_uuid)
          .filter((uuid): uuid is string => Boolean(uuid)),
      })
    );
  },
});

export const scoreToolUsageContinuation = (cycles: ContinuationCycle[]): ToolUsageScore => {
  if (cycles.length === 0) {
    return { score: 0, label: 'no-cycles', explanation: 'No cycles to score' };
  }

  const perCycle = cycles.map((cycle, cycleIndex): ToolUsageScore => {
    const steps = cycle.steps ?? [];
    const baseScore = scoreToolUsage({
      steps,
      detectionCount: 1,
      // Establishing cycle of a new episode may write topology without a topology search.
      // A new event after a closed seed (`expectReuse: false`) still requires that search.
      allowNewEventTopologyWrite: cycleIndex === 0 && cycle.expectReuse !== false,
    });
    if (
      cycleIndex > 0 &&
      cycle.expectTopologyEventSearch &&
      !extractOrderedToolCalls(steps).some(
        ({ toolId, params }) =>
          isTool(toolId, TOOL_ID_EVENT_SEARCH) &&
          Array.isArray(params.topology_feature_ids) &&
          params.topology_feature_ids.length > 0
      )
    ) {
      return {
        score: 0,
        label: 'missing-topology-search',
        explanation: `${TOOL_ID_EVENT_SEARCH} was not called with topology_feature_ids: […] — required to filter events by topology`,
      };
    }
    return baseScore;
  });

  const score = perCycle.reduce((sum, r) => sum + r.score, 0) / perCycle.length;
  return {
    score,
    label: score === 1 ? 'correct' : 'partial',
    explanation: perCycle.map((r, i) => `cycle ${i + 1}: ${r.label} (${r.score})`).join('; '),
  };
};

/** CODE evaluator: mean per-cycle tool-usage score for the continuation test. */
export const continuationTrajectoryEvaluator: ContinuationEvaluator = {
  name: 'trajectory',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) => Promise.resolve(scoreToolUsageContinuation(output.cycles ?? [])),
};
