/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Condition, StreamlangDSL, StreamlangProcessorDefinition } from '@kbn/streamlang';
import {
  combineConditionsAsAnd,
  combineConditionsForElseBranch,
  conditionToPainless,
  isConditionBlock,
  transpileIngestPipeline,
} from '@kbn/streamlang';
import type { StreamlangResolverOptions } from '@kbn/streamlang/types/resolvers';

type StreamlangStep = StreamlangDSL['steps'][number];

function createConditionNoopProcessor({
  conditionId,
  condition,
}: {
  conditionId: string;
  condition: Condition;
}): NonNullable<IngestProcessorContainer>[] {
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

async function buildSimulationProcessorsFromSteps({
  steps,
  parentCondition,
  resolverOptions,
}: {
  steps: StreamlangStep[];
  parentCondition?: Condition;
  resolverOptions?: StreamlangResolverOptions;
}): Promise<NonNullable<IngestProcessorContainer>[]> {
  const processors: NonNullable<IngestProcessorContainer>[] = [];

  for (const step of steps) {
    if (isConditionBlock(step)) {
      const conditionId = step.customIdentifier;
      const { steps: nestedSteps, else: elseSteps, ...restCondition } = step.condition;
      const combinedCondition = combineConditionsAsAnd(parentCondition, restCondition);

      // Only emit no-op processors for identified condition blocks
      // (UI blocks always have ids, but Streamlang schema allows them to be omitted).
      if (conditionId && combinedCondition) {
        // Pre-order insertion: ensure this runs before any nested processors (even if they later fail).
        processors.push(
          ...createConditionNoopProcessor({ conditionId, condition: combinedCondition })
        );
      }

      // Process if-branch steps
      processors.push(
        ...(await buildSimulationProcessorsFromSteps({
          steps: nestedSteps,
          parentCondition: combinedCondition,
          resolverOptions,
        }))
      );

      // Process else-branch steps with negated condition
      if (elseSteps && elseSteps.length > 0) {
        const negatedCondition = combineConditionsForElseBranch(parentCondition, restCondition);

        // Emit noop for else-branch condition tracking
        if (conditionId && negatedCondition) {
          processors.push(
            ...createConditionNoopProcessor({
              conditionId: `${conditionId}:else`,
              condition: negatedCondition,
            })
          );
        }

        processors.push(
          ...(await buildSimulationProcessorsFromSteps({
            steps: elseSteps,
            parentCondition: negatedCondition,
            resolverOptions,
          }))
        );
      }

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

    const transpiled = (
      await transpileIngestPipeline(
        { steps: [stepWithCombinedWhere] } as StreamlangDSL,
        {
          ignoreMalformed: true,
          traceCustomIdentifiers: true,
        },
        resolverOptions
      )
    ).processors as NonNullable<IngestProcessorContainer>[];

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
export async function buildSimulationProcessorsWithConditionNoops(
  processing: StreamlangDSL,
  resolverOptions?: StreamlangResolverOptions
): Promise<NonNullable<IngestProcessorContainer>[]> {
  return await buildSimulationProcessorsFromSteps({
    steps: processing.steps,
    resolverOptions,
  });
}
