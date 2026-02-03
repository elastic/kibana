/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Condition, StreamlangDSL, StreamlangProcessorDefinition } from '@kbn/streamlang';
import { conditionToPainless, isConditionBlock, transpileIngestPipeline } from '@kbn/streamlang';

type StreamlangStep = StreamlangDSL['steps'][number];

function combineConditionsAsAnd(condA?: Condition, condB?: Condition): Condition | undefined {
  if (!condA) return condB;
  if (!condB) return condA;
  return { and: [condA, condB] };
}

function createConditionNoopProcessor({
  conditionId,
  condition,
}: {
  conditionId: string;
  condition: Condition;
}): IngestProcessorContainer[] {
  let painlessIf: string;
  try {
    painlessIf = conditionToPainless(condition);
  } catch {
    // While editing, conditions can be temporarily invalid. Treat as "never matches" so:
    // - simulation keeps running (live updates)
    // - match rate resolves to 0% until the condition becomes valid
    painlessIf = 'false';
  }

  // Use set + remove instead of a painless script to avoid compilation overhead.
  // This creates a true no-op that doesn't require painless to be enabled.
  const tempField = '_streams_condition_noop';

  // The remove processor uses a distinct tag suffix so it gets filtered out
  // but doesn't double-count in processor metrics (which aggregate by tag).
  const removeTag = `${conditionId}:noop-cleanup`;

  return [
    {
      set: {
        tag: conditionId,
        field: tempField,
        value: true,
        if: painlessIf,
      },
    },
    {
      remove: {
        tag: removeTag,
        field: tempField,
        ignore_missing: true,
        if: painlessIf,
      },
    },
  ];
}

function buildSimulationProcessorsFromSteps({
  steps,
  parentCondition,
}: {
  steps: StreamlangStep[];
  parentCondition?: Condition;
}): IngestProcessorContainer[] {
  const processors: IngestProcessorContainer[] = [];

  for (const step of steps) {
    if (isConditionBlock(step)) {
      const conditionId = step.customIdentifier;
      const { steps: nestedSteps, ...restCondition } = step.condition;
      const combinedCondition = combineConditionsAsAnd(parentCondition, restCondition);

      // Only emit no-op processors for identified condition blocks
      // (UI blocks always have ids, but Streamlang schema allows them to be omitted).
      if (conditionId && combinedCondition) {
        // Pre-order insertion: ensure this runs before any nested processors (even if they later fail).
        processors.push(
          ...createConditionNoopProcessor({ conditionId, condition: combinedCondition })
        );
      }

      processors.push(
        ...buildSimulationProcessorsFromSteps({
          steps: nestedSteps,
          parentCondition: combinedCondition,
        })
      );

      continue;
    }

    const processorStep = step as StreamlangProcessorDefinition;
    const combinedWhere =
      'where' in processorStep && processorStep.where
        ? combineConditionsAsAnd(parentCondition, processorStep.where)
        : parentCondition;

    const stepWithCombinedWhere =
      combinedWhere !== undefined
        ? ({
            ...processorStep,
            where: combinedWhere,
          } as StreamlangProcessorDefinition)
        : processorStep;

    const transpiled = transpileIngestPipeline(
      { steps: [stepWithCombinedWhere] } as StreamlangDSL,
      { ignoreMalformed: true, traceCustomIdentifiers: true }
    ).processors;

    processors.push(...transpiled);
  }

  return processors;
}

/**
 * Builds ingest pipeline processors for simulation runs.
 *
 * This is identical to normal transpilation, except it injects simulation-only no-op processors
 * (set + remove of a temporary field) *under each condition block* (tagged with the condition
 * customIdentifier), so simulation metrics can compute condition match rates even if there are
 * no descendants or descendants are faulty.
 *
 * The set processor is tagged with the condition ID for metric tracking. Using set+remove instead
 * of a painless script avoids compilation overhead and works even without painless enabled.
 *
 * These processors are never exposed as steps in the UI; they exist only in the ES `_simulate` request.
 */
export function buildSimulationProcessorsWithConditionNoops(
  processing: StreamlangDSL
): IngestProcessorContainer[] {
  return buildSimulationProcessorsFromSteps({ steps: processing.steps });
}
