/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Condition } from '../../../../types/conditions';
import type { ManualIngestPipelineProcessor } from '../../../../types/processors';
import {
  type ElasticsearchProcessorType,
  elasticsearchProcessorTypes,
} from '../../../../types/processors/manual_ingest_pipeline_processors';
import type { IngestPipelineTranspilationOptions } from '..';
import {
  conditionToPainless,
  conditionToPainlessCheck,
} from '../../../conditions/condition_to_painless';

/**
 * Combines a parent condition (Streamlang Condition from the `where` clause) with
 * a nested processor's existing `if` condition (raw Painless string from user).
 *
 * When both exist, the parent condition is compiled and checked first. If it fails,
 * the processor is skipped. Otherwise, the nested condition is evaluated.
 */
function combineIfConditions(
  parentCondition: Condition | undefined,
  nestedIf: string | undefined
): string | undefined {
  if (!parentCondition && !nestedIf) {
    return undefined;
  }
  if (!parentCondition) {
    return nestedIf;
  }
  if (!nestedIf) {
    // Only parent condition - compile it directly
    return conditionToPainless(parentCondition);
  }

  // Both conditions exist - combine them using conditionToPainlessCheck
  // which sets a variable instead of returning, allowing us to chain conditions
  const parentConditionCheck = conditionToPainlessCheck(parentCondition, '_parentConditionMet');

  return `
// Combined condition: parent 'where' AND nested 'if'
def _parentConditionMet = false;
${parentConditionCheck}
if (!_parentConditionMet) {
  return false;
}
// Evaluate nested processor's 'if' condition
${nestedIf}
`;
}

export const processManualIngestPipelineProcessors = (
  manualIngestPipelineProcessor: Omit<ManualIngestPipelineProcessor, 'where' | 'action'> & {
    if?: Condition;
    tag?: string;
  },
  transpilationOptions?: IngestPipelineTranspilationOptions
) => {
  // manual_ingest_pipeline processor is a special case, since it has nested Elasticsearch-level processors and doesn't support if
  // directly - we need to add it to each nested processor.
  const parentCondition = manualIngestPipelineProcessor.if;

  return manualIngestPipelineProcessor.processors.flatMap((nestedProcessor) => {
    const nestedType = Object.keys(nestedProcessor)[0];
    if (!elasticsearchProcessorTypes.includes(nestedType as ElasticsearchProcessorType)) {
      if (transpilationOptions?.ignoreMalformed) {
        return [];
      }
      throw new Error(
        `Invalid processor type "${nestedType}" in manual_ingest_pipeline processor. Supported types: ${elasticsearchProcessorTypes.join(
          ', '
        )}`
      );
    }
    const nestedConfig = nestedProcessor[nestedType as ElasticsearchProcessorType] as Record<
      string,
      unknown
    >;
    if (typeof nestedConfig !== 'object' || nestedConfig === null) {
      if (transpilationOptions?.ignoreMalformed) {
        return [];
      }
      throw new Error(
        `Invalid processor config for "${nestedType}" in manual_ingest_pipeline processor. Expected an object.`
      );
    }

    const nestedIf = nestedConfig.if as string | undefined;
    const combinedIf = combineIfConditions(parentCondition, nestedIf);

    return {
      [nestedType]: {
        ...nestedConfig,
        tag: manualIngestPipelineProcessor.tag ?? nestedConfig.tag,
        ignore_failure: nestedConfig.ignore_failure ?? manualIngestPipelineProcessor.ignore_failure,
        on_failure: nestedConfig.on_failure
          ? [
              ...(nestedConfig.on_failure as []),
              ...(manualIngestPipelineProcessor.on_failure || []),
            ]
          : manualIngestPipelineProcessor.on_failure,
        ...(combinedIf ? { if: combinedIf } : {}),
      },
    } as IngestProcessorContainer;
  });
};
