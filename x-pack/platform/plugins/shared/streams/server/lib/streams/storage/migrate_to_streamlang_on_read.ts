/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import type { Condition, ManualIngestPipelineProcessor, StreamlangDSL } from '@kbn/streamlang';
import { ALWAYS_CONDITION, conditionToPainless } from '@kbn/streamlang';
import type { ConditionWithSteps, StreamlangStep } from '@kbn/streamlang/types/streamlang';

export const migrateRoutingIfConditionToStreamlang = (definition: Record<string, unknown>) => {
  const routingArr = (definition.ingest as { wired: { routing: OldRoutingDefinition[] } }).wired
    .routing;
  const migratedRouting = routingArr.map((route) => {
    const { if: oldIf, ...rest } = route;
    const where = recursivelyConvertCondition(oldIf);
    return {
      ...rest,
      where,
    };
  });
  return {
    ...definition,
    ingest: {
      ...(typeof definition.ingest === 'object' && definition.ingest !== null
        ? definition.ingest
        : {}),
      wired: {
        ...(definition.ingest as { wired: object }).wired,
        routing: migratedRouting,
      },
    },
  };
};

export const migrateOldProcessingArrayToStreamlang = (definition: Record<string, unknown>) => {
  const oldProcessing =
    typeof definition.ingest === 'object' &&
    definition.ingest !== null &&
    'processing' in definition.ingest
      ? (definition.ingest as { processing?: OldProcessorDefinition[] }).processing
      : undefined;

  // Arrays to collect manual_ingest_pipeline processors and others
  const manualIngestPipelineProcessors: ManualIngestPipelineProcessor[] = [];
  const otherProcessors: Array<Record<string, unknown>> = [];

  if (Array.isArray(oldProcessing)) {
    oldProcessing.forEach((proc) => {
      if (
        proc &&
        typeof proc === 'object' &&
        'manual_ingest_pipeline' in proc &&
        Array.isArray(
          (proc as { manual_ingest_pipeline?: { processors?: unknown[] } }).manual_ingest_pipeline
            ?.processors
        )
      ) {
        const mip = (
          proc as unknown as {
            manual_ingest_pipeline: {
              processors: ManualIngestPipelineProcessor['processors'];
              description?: string;
              ignore_failure?: boolean;
              if: OldCondition;
              tag?: string;
            };
            on_failure?: ManualIngestPipelineProcessor['on_failure'];
          }
        ).manual_ingest_pipeline;
        const streamlangManualIngestPipeline: ManualIngestPipelineProcessor = {
          action: 'manual_ingest_pipeline',
          processors: mip.processors,
          description: mip.description,
          ignore_failure: mip.ignore_failure,
          where: recursivelyConvertCondition(mip.if),
          tag: mip.tag,
          on_failure: (
            proc as unknown as { on_failure?: ManualIngestPipelineProcessor['on_failure'] }
          ).on_failure,
        };
        // Use manual_ingest_pipeline processor as is once converted to Streamlang
        manualIngestPipelineProcessors.push(streamlangManualIngestPipeline);
      } else if (proc) {
        const type = Object.keys(proc)[0];
        const config = proc[type];

        // Collect other processor types
        otherProcessors.push({
          [type]: {
            ...config,
            ...('if' in config
              ? { if: conditionToPainless(recursivelyConvertCondition(config.if!)) }
              : {}),
          },
        });
      }
    });

    // If there are any other processors, merge them into a single manual_ingest_pipeline processor
    if (otherProcessors.length > 0) {
      const streamlangManualIngestPipeline: ManualIngestPipelineProcessor = {
        action: 'manual_ingest_pipeline',
        processors: otherProcessors,
        ignore_failure: true,
        where: ALWAYS_CONDITION,
      };

      manualIngestPipelineProcessors.push(streamlangManualIngestPipeline);
    }
  }

  // Convert to StreamlangDSL steps
  const newProcessing: StreamlangDSL = {
    steps: manualIngestPipelineProcessors,
  };

  return {
    ...definition,
    ingest: {
      ...(typeof definition.ingest === 'object' ? definition.ingest : {}),
      processing: newProcessing,
    },
  };
};

/** Drills down until we find filter conditions and converts from the old
 * syntax to the new Streamlang syntax.
 */
const recursivelyConvertCondition = (condition: OldCondition): Condition => {
  if ('and' in condition) {
    return {
      and: condition.and.map(recursivelyConvertCondition),
    };
  }

  if ('or' in condition) {
    return {
      or: condition.or.map(recursivelyConvertCondition),
    };
  }

  if ('always' in condition) {
    return {
      always: {},
    };
  }

  if ('never' in condition) {
    return {
      never: {},
    };
  }

  const newOperator =
    condition.operator === 'exists' || condition.operator === 'notExists'
      ? 'exists'
      : condition.operator;

  const newValue =
    condition.operator === 'exists'
      ? true
      : condition.operator === 'notExists'
      ? false
      : 'value' in condition
      ? condition.value
      : undefined;

  // If it's a filter condition, convert formats.
  return {
    field: condition.field,
    [newOperator]: newValue,
  };
};

/**
 * These are just simplified versions of the old types to provide some type safety.
 */
/** Deprecated */
export interface OldBinaryFilterCondition {
  field: string;
  operator: string;
  value: string | number | boolean;
}
/** Deprecated */
export interface OldUnaryFilterCondition {
  field: string;
  operator: 'exists' | 'notExists';
}
/** Deprecated */
export type OldFilterCondition = OldBinaryFilterCondition | OldUnaryFilterCondition;
/** Deprecated */
export interface OldAndCondition {
  and: OldCondition[];
}
/** Deprecated */
export interface OldOrCondition {
  or: OldCondition[];
}
/** Deprecated */
export interface OldAlwaysCondition {
  always: {};
}
/** Deprecated */
export interface OldNeverCondition {
  never: {};
}
/** Deprecated */
export type OldCondition =
  | OldFilterCondition
  | OldAndCondition
  | OldOrCondition
  | OldNeverCondition
  | OldAlwaysCondition;

/** Deprecated */
type OldProcessorConfig = Record<string, unknown> & {
  if?: OldCondition;
};

/** Deprecated */
/** Holds a single key with a processor type, e.g. grok, date etc */
type OldProcessorDefinition = Record<string, OldProcessorConfig>;

type OldRoutingDefinition = Record<string, unknown> & {
  if: OldCondition;
};

/**
 * Legacy where block format (before condition property rename)
 * @deprecated Use StreamlangConditionBlock with 'condition' property instead
 */
export interface LegacyWhereBlock {
  customIdentifier?: string;
  where: ConditionWithSteps;
}

/**
 * Type guard for legacy where blocks
 */
function isLegacyWhereBlock(step: unknown): step is LegacyWhereBlock {
  return (
    isObject(step) &&
    'where' in step &&
    !('action' in step) &&
    isObject(step.where) &&
    'steps' in step.where &&
    Array.isArray((step.where as { steps?: unknown[] }).steps)
  );
}

/**
 * Migrates old where blocks that use 'where' property to new format using 'condition' property.
 * This provides natural discrimination between where blocks and action steps with where clauses.
 */
export function migrateWhereBlocksToCondition(steps: unknown[]): {
  steps: StreamlangStep[];
  migrated: boolean;
} {
  let migrated = false;

  const migrateStep = (step: unknown): StreamlangStep => {
    // Check if this is a legacy where block
    if (isLegacyWhereBlock(step)) {
      migrated = true;
      const { where, customIdentifier } = step;
      const { steps: nestedSteps, ...conditionWithoutSteps } = where;

      // Recursively migrate nested steps
      const nestedResult = migrateWhereBlocksToCondition(nestedSteps);

      // Return new format with 'condition' property
      const migratedBlock: StreamlangStep = {
        condition: {
          ...conditionWithoutSteps,
          steps: nestedResult.steps,
        },
      };

      // Preserve customIdentifier if it exists
      if (customIdentifier) {
        (migratedBlock as StreamlangStep & { customIdentifier?: string }).customIdentifier =
          customIdentifier;
      }

      return migratedBlock;
    }

    // For action steps (or already-migrated where blocks), return as-is
    // Action steps may have 'where' clauses, but those are conditions, not where blocks
    return step as StreamlangStep;
  };

  const migratedSteps = steps.map(migrateStep);

  return { steps: migratedSteps, migrated };
}
