/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition, ManualIngestPipelineProcessor, StreamlangDSL } from '@kbn/streamlang';
import { ALWAYS_CONDITION, NEVER_CONDITION, conditionToPainless } from '@kbn/streamlang';

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
  const otherProcessors: any[] = [];

  if (Array.isArray(oldProcessing)) {
    oldProcessing.forEach((proc) => {
      if (
        proc &&
        typeof proc === 'object' &&
        'manual_ingest_pipeline' in proc &&
        Array.isArray((proc as any).manual_ingest_pipeline?.processors)
      ) {
        const streamlangManualIngestPipeline: ManualIngestPipelineProcessor = {
          action: 'manual_ingest_pipeline',
          processors: (proc as any).manual_ingest_pipeline.processors,
          description: (proc as any).manual_ingest_pipeline.description,
          ignore_failure: (proc as any).manual_ingest_pipeline.ignore_failure,
          where: recursivelyConvertCondition((proc as any).manual_ingest_pipeline.if),
          tag: (proc as any).manual_ingest_pipeline.tag,
          on_failure: (proc as any).on_failure,
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
      type: 'and',
      and: condition.and.map(recursivelyConvertCondition),
    };
  }

  if ('or' in condition) {
    return {
      type: 'or',
      or: condition.or.map(recursivelyConvertCondition),
    };
  }

  if ('always' in condition) {
    return ALWAYS_CONDITION;
  }

  if ('never' in condition) {
    return NEVER_CONDITION;
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
    type: 'filter',
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
