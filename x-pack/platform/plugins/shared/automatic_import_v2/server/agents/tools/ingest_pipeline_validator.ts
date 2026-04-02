/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolRunnableConfig } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import type { estypes } from '@elastic/elasticsearch';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server';
import type { AutomaticImportAgentStateType } from '../state';
import {
  flattenDoc,
  formatSimulateDoc,
  groupErrors,
  stripBoilerplateFields,
  processSimulationResults,
} from './pipeline_utils';

const MAX_UNIQUE_ERROR_TYPES = 10;
const MAX_SAMPLE_OUTPUTS = 3;

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const asArray = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
};

export interface ValidatorToolOptions {
  esClient: ElasticsearchClient;
  samples: string[];
  packageName: string;
  dataStreamName: string;
  fieldsMetadataClient: IFieldsMetadataClient;
}

const pickRandomSamples = <T>(items: T[], count: number): T[] => {
  if (items.length <= count) return items;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

function makeErrorCommand(message: string, totalSamples: number, toolCallId: string): Command {
  return new Command({
    update: {
      pipeline_generation_results: [],
      failure_count: totalSamples,
      pipeline_validation_results: {
        success_rate: 0,
        successful_samples: 0,
        failed_samples: totalSamples,
        total_samples: totalSamples,
        failure_details: [{ error: message, sample: 'Pipeline validation error' }],
      },
      messages: [
        new ToolMessage({
          content: message,
          tool_call_id: toolCallId,
        }),
      ],
    },
  });
}

export function ingestPipelineValidatorTool(options: ValidatorToolOptions): DynamicStructuredTool {
  const { esClient, samples, packageName, dataStreamName, fieldsMetadataClient } = options;

  const customFieldPrefix = `${packageName}.${dataStreamName}.`;

  const validatorSchema = z.object({});

  return new DynamicStructuredTool({
    name: 'validate_pipeline',
    description:
      'Validates the current pipeline in state against ALL log samples. ' +
      'Takes no arguments — reads the pipeline from state automatically. ' +
      'Returns condensed results: success rate, up to 5 sample outputs, and deduplicated error types (max 10). ' +
      'Persists the pipeline and validation results to shared state. ' +
      'Call this as your final step after building the pipeline with modify_pipeline.',
    schema: validatorSchema,
    func: async (
      _input: z.infer<typeof validatorSchema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      const toolCallId = config?.toolCall?.id ?? '';
      const state = getCurrentTaskInput<AutomaticImportAgentStateType>();
      const currentPipeline = state.current_pipeline;

      if (!currentPipeline?.processors || currentPipeline.processors.length === 0) {
        return makeErrorCommand(
          'No pipeline in state. Use modify_pipeline to build one first.',
          samples.length,
          toolCallId
        );
      }

      if (!samples || samples.length === 0) {
        return new Command({
          update: {
            pipeline_generation_results: [],
            failure_count: 0,
            pipeline_validation_results: {
              success_rate: 0,
              successful_samples: 0,
              failed_samples: 0,
              total_samples: 0,
              failure_details: [],
            },
            messages: [
              new ToolMessage({
                content: 'No samples available for validation.',
                tool_call_id: toolCallId,
              }),
            ],
          },
        });
      }

      const docs = samples.map(formatSimulateDoc);

      let response;
      try {
        response = await esClient.ingest.simulate({
          docs,
          pipeline: currentPipeline as estypes.IngestPipeline,
        });
      } catch (simulateError) {
        return makeErrorCommand(
          `Pipeline simulation failed: ${(simulateError as Error).message}`,
          samples.length,
          toolCallId
        );
      }

      const { failedSamples, successfulDocuments, successfulCount } = processSimulationResults(
        response,
        samples
      );

      const failedCount = failedSamples.length;
      const totalSamples = samples.length;
      const successRate = totalSamples > 0 ? (successfulCount / totalSamples) * 100 : 0;

      const summaryMessage =
        failedCount === 0
          ? `Pipeline validation successful! All ${totalSamples} samples processed correctly.`
          : `Pipeline validation completed with ${successfulCount}/${totalSamples} successful (${successRate.toFixed(
              1
            )}%).`;

      const sampledOutputs = pickRandomSamples(successfulDocuments, MAX_SAMPLE_OUTPUTS).map(
        (doc, i) => ({
          sample_index: i,
          source: stripBoilerplateFields(doc as Record<string, unknown>),
        })
      );

      const errorGroups = groupErrors(failedSamples, MAX_UNIQUE_ERROR_TYPES);

      // Collect unique field paths from sample outputs
      const allFieldPaths = new Set<string>();
      for (const doc of successfulDocuments.slice(0, 20)) {
        for (const fp of Object.keys(flattenDoc(doc as Record<string, unknown>))) {
          allFieldPaths.add(fp);
        }
      }

      // Batch-resolve only the fields present in outputs against ECS, plus root fieldsets and event.kind metadata
      const ecsWarnings: string[] = [];
      const fieldNamingErrors: string[] = [];

      try {
        const [ecsHitDict, ecsFieldsets, eventKindField] = await Promise.all([
          fieldsMetadataClient.find({ fieldNames: [...allFieldPaths], source: ['ecs'] }),
          fieldsMetadataClient.getECSFieldsets(),
          fieldsMetadataClient
            .getByName('event.kind', { source: ['ecs'] })
            .then((field) => field?.pick(['allowed_values'])),
        ]);

        const ecsFieldSet = new Set(Object.keys(ecsHitDict.getFields()));
        const ecsRootSet = new Set(ecsFieldsets);
        const validEventKinds = new Set(
          (eventKindField?.allowed_values ?? []).map((av) => av.name)
        );

        for (const doc of successfulDocuments.slice(0, 20)) {
          const source = doc as Record<string, unknown>;
          const categories = asArray(getNestedValue(source, 'event.category'));
          const types = asArray(getNestedValue(source, 'event.type'));
          const eventKind = getNestedValue(source, 'event.kind');

          if (categories.length > 0 && types.length > 0) {
            const valid = await fieldsMetadataClient.matchesAnyTypeForEventCategory(
              categories,
              types
            );
            if (!valid) {
              ecsWarnings.push(
                `Invalid event.category/type combination: categories=${JSON.stringify(
                  categories
                )}, types=${JSON.stringify(types)}`
              );
            }
          }

          if (typeof eventKind === 'string' && !validEventKinds.has(eventKind)) {
            ecsWarnings.push(
              `Invalid event.kind: "${eventKind}". Valid values: ${[...validEventKinds].join(', ')}`
            );
          }
        }

        const hasTimestamp = successfulDocuments.some(
          (doc) => (doc as Record<string, unknown>)['@timestamp'] != null
        );
        if (!hasTimestamp && successfulDocuments.length > 0) {
          ecsWarnings.push('@timestamp is not set in any processed document');
        }

        for (const fieldPath of allFieldPaths) {
          if (ecsFieldSet.has(fieldPath)) continue;

          const dotIndex = fieldPath.indexOf('.');
          const root = dotIndex !== -1 ? fieldPath.substring(0, dotIndex) : fieldPath;

          if (ecsRootSet.has(root)) {
            fieldNamingErrors.push(
              `Field '${fieldPath}' is under ECS root '${root}' but is not a valid ECS field. ` +
                `Custom fields under ECS paths are not allowed. ` +
                `Either use a valid ECS field or rename to '${customFieldPrefix}${fieldPath.substring(
                  dotIndex + 1
                )}'.`
            );
          } else if (!fieldPath.startsWith(customFieldPrefix)) {
            fieldNamingErrors.push(
              `Field '${fieldPath}' is not an ECS field and is not properly namespaced. ` +
                `Non-ECS fields must use the format '${customFieldPrefix}<field_name>'.`
            );
          }
        }
      } catch (ecsError) {
        ecsWarnings.push(
          `ECS validation unavailable: ${(ecsError as Error).message ?? String(ecsError)}`
        );
      }

      const uniqueEcsWarnings = [...new Set(ecsWarnings)];

      const uniqueFieldNamingErrors = [...new Set(fieldNamingErrors)];

      const detailedResponse = JSON.stringify({
        message: summaryMessage,
        success_rate: successRate,
        successful_samples: successfulCount,
        failed_samples: failedCount,
        total_samples: totalSamples,
        successful_output_samples: sampledOutputs,
        ...(errorGroups.length > 0
          ? {
              error_groups: errorGroups,
              total_unique_error_types: new Set(failedSamples.map((f) => f.error)).size,
            }
          : {}),
        ...(uniqueEcsWarnings.length > 0 ? { ecs_warnings: uniqueEcsWarnings } : {}),
        ...(uniqueFieldNamingErrors.length > 0
          ? { field_naming_errors: uniqueFieldNamingErrors }
          : {}),
      });

      return new Command({
        update: {
          current_pipeline: currentPipeline,
          pipeline_generation_results: successfulDocuments,
          failure_count: failedCount,
          pipeline_validation_results: {
            success_rate: successRate,
            successful_samples: successfulCount,
            failed_samples: failedCount,
            total_samples: totalSamples,
            failure_details: failedSamples.slice(0, 100).map((f) => ({
              error: f.error,
              sample: f.sample,
            })),
          },
          messages: [
            new ToolMessage({
              content: detailedResponse,
              tool_call_id: toolCallId,
            }),
          ],
        },
      });
    },
  });
}
