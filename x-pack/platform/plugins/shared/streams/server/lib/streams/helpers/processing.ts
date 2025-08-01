/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ManualIngestPipelineProcessorConfig,
  ElasticsearchProcessorType,
  ProcessorDefinition,
  elasticsearchProcessorTypes,
  getProcessorConfig,
  getProcessorType,
} from '@kbn/streams-schema';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { WhereProcessorConfig } from '@kbn/streams-schema/src/models/ingest/processors';
import { conditionToPainless } from './condition_to_painless';

function mergeIfs(if1: string | undefined, if2: string): string {
  if (!if1) {
    return if2;
  }
  return `
   (${if1} && ${if2})
  `;
}

export function formatToIngestProcessors(
  processing: ProcessorDefinition[],
  {
    ignoreMalformedManualIngestPipeline,
    addSimulateStuff = false,
  }: {
    ignoreMalformedManualIngestPipeline?: boolean;
    addSimulateStuff?: boolean;
  } = {}
): IngestProcessorContainer[] {
  return processing.flatMap((processor) => {
    const config = getProcessorConfig(processor);
    const type = getProcessorType(processor);
    if (type === 'where') {
      const whereProcessorConfig = config as WhereProcessorConfig;
      // where processor is a special case, since it has nested processors and needs to be unwrapped
      return formatToIngestProcessors(whereProcessorConfig.steps, {
        ignoreMalformedManualIngestPipeline,
        addSimulateStuff,
      }).map((nestedProcessor) => {
        // Add the `if` condition to each nested processor
        const firstKey = Object.keys(nestedProcessor)[0];
        return {
          ...nestedProcessor,
          [firstKey]: {
            ...nestedProcessor[firstKey],
            // TODO: Support anding the ifs together
            ...(whereProcessorConfig.if
              ? {
                  if: mergeIfs(
                    nestedProcessor[firstKey].if,
                    conditionToPainless(whereProcessorConfig.if)
                  ),
                }
              : {}),
          },
        };
      });
    } else if (type === 'manual_ingest_pipeline') {
      const manualIngestPipelineProcessorConfig = config as ManualIngestPipelineProcessorConfig;

      // manual_ingest_pipeline processor is a special case, since it has nested Elasticsearch-level processors and doesn't support if
      // directly - we need to add it to each nested processor
      return manualIngestPipelineProcessorConfig.processors.flatMap((nestedProcessor) => {
        const nestedType = Object.keys(nestedProcessor)[0];
        if (!elasticsearchProcessorTypes.includes(nestedType as ElasticsearchProcessorType)) {
          if (ignoreMalformedManualIngestPipeline) {
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
          if (ignoreMalformedManualIngestPipeline) {
            return [];
          }
          throw new Error(
            `Invalid processor config for "${nestedType}" in manual_ingest_pipeline processor. Expected an object.`
          );
        }
        return {
          [nestedType]: {
            ...nestedConfig,
            tag: manualIngestPipelineProcessorConfig.tag ?? nestedConfig.tag,
            ignore_failure:
              nestedConfig.ignore_failure ?? manualIngestPipelineProcessorConfig.ignore_failure,
            on_failure: nestedConfig.on_failure
              ? [
                  ...(nestedConfig.on_failure as []),
                  ...(manualIngestPipelineProcessorConfig.on_failure || []),
                ]
              : manualIngestPipelineProcessorConfig.on_failure,
            ...(!nestedConfig.if && 'if' in config && config.if
              ? { if: conditionToPainless(config.if) }
              : {}),
          },
        } as IngestProcessorContainer;
      });
    }

    return [
      {
        [type]: {
          ...config,
          ...('if' in config && config.if ? { if: conditionToPainless(config.if) } : {}),
          ...(addSimulateStuff
            ? {
                tag: processor.id,
                on_failure: [
                  {
                    append: {
                      field: '_errors',
                      value: {
                        message: '{{{ _ingest.on_failure_message }}}',
                        processor_id: '{{{ _ingest.on_failure_processor_tag }}}',
                        type: 'generic_processor_failure',
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      },
    ];
  });
}
