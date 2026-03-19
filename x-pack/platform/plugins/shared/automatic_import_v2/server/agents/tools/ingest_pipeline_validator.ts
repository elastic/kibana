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
import type { EcsFlatEntry } from './get_ecs_info';
import type { AutomaticImportAgentState } from '../state';

const MAX_UNIQUE_ERROR_TYPES = 10;
const MAX_SAMPLE_OUTPUTS = 3;

const STRIPPED_OUTPUT_FIELDS = new Set(['event.original', 'ecs.version']);

const ECS_EVENT_TYPES_PER_CATEGORY: Record<string, string[]> = {
  api: [
    'access',
    'admin',
    'allowed',
    'change',
    'creation',
    'deletion',
    'denied',
    'end',
    'info',
    'start',
    'user',
  ],
  authentication: ['start', 'end', 'info'],
  configuration: ['access', 'change', 'creation', 'deletion', 'info'],
  database: ['access', 'change', 'info', 'error'],
  driver: ['change', 'end', 'info', 'start'],
  email: ['info'],
  file: ['access', 'change', 'creation', 'deletion', 'info'],
  host: ['access', 'change', 'end', 'info', 'start'],
  iam: ['admin', 'change', 'creation', 'deletion', 'group', 'info', 'user'],
  intrusion_detection: ['allowed', 'denied', 'info'],
  library: ['start'],
  malware: ['info'],
  network: ['access', 'allowed', 'connection', 'denied', 'end', 'info', 'protocol', 'start'],
  package: ['access', 'change', 'deletion', 'info', 'installation', 'start'],
  process: ['access', 'change', 'end', 'info', 'start'],
  registry: ['access', 'change', 'creation', 'deletion'],
  session: ['start', 'end', 'info'],
  threat: ['indicator'],
  vulnerability: ['info'],
  web: ['access', 'error', 'info'],
};

const VALID_EVENT_KINDS = new Set([
  'alert',
  'enrichment',
  'event',
  'metric',
  'state',
  'pipeline_error',
  'signal',
]);

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

const IGNORED_FIELDS: string[] = [];

const flattenKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
};

interface ValidatorToolOptions {
  esClient: ElasticsearchClient;
  samples: string[];
  packageName: string;
  dataStreamName: string;
  ecsFlatData: Record<string, EcsFlatEntry>;
}

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
    [key: string]: unknown;
  };
}

function formatSample(sample: string): DocTemplate {
  return {
    _index: 'index',
    _id: 'id',
    _source: { message: sample },
  };
}

interface FailedSample {
  sample: string;
  error: string;
}

interface ErrorGroup {
  error: string;
  count: number;
  example_sample: string;
}

const groupErrors = (failedSamples: FailedSample[]): ErrorGroup[] => {
  const groups = new Map<string, { count: number; example: string }>();

  for (const { error, sample } of failedSamples) {
    const existing = groups.get(error);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(error, { count: 1, example: sample.substring(0, 300) });
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_UNIQUE_ERROR_TYPES)
    .map(([error, { count, example }]) => ({
      error,
      count,
      example_sample: example,
    }));
};

const pickRandomSamples = <T>(items: T[], count: number): T[] => {
  if (items.length <= count) return items;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

function makeErrorCommand(
  message: string,
  totalSamples: number,
  toolCallId: string
): Command {
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
  const { esClient, samples, packageName, dataStreamName, ecsFlatData } = options;

  const ecsFieldSet = new Set(Object.keys(ecsFlatData));
  const ecsRootSet = new Set<string>();
  for (const key of ecsFieldSet) {
    const dotIndex = key.indexOf('.');
    if (dotIndex !== -1) {
      ecsRootSet.add(key.substring(0, dotIndex));
    }
  }
  const ignoredFieldSet = new Set(IGNORED_FIELDS);
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
      const toolCallId = config?.toolCall?.id as string;
      const state = getCurrentTaskInput<z.infer<typeof AutomaticImportAgentState>>();
      const currentPipeline = state.current_pipeline;

      if (
        !currentPipeline?.processors ||
        currentPipeline.processors.length === 0
      ) {
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

      const docs = samples.map((sample: string) => formatSample(sample));

      let response: estypes.IngestSimulateResponse;
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

      const failedSamples: FailedSample[] = [];
      const successfulDocuments: Array<estypes.IngestDocumentSimulation['doc']> = [];
      let successfulCount = 0;

      response.docs.forEach((doc, index) => {
        if (!doc) {
          failedSamples.push({
            sample: samples[index],
            error: 'Document was dropped by the pipeline',
          });
        } else if (doc.doc?._source?.error) {
          const errorDetail =
            typeof doc.doc._source.error === 'string'
              ? doc.doc._source.error
              : JSON.stringify(doc.doc._source.error);
          failedSamples.push({
            sample: samples[index],
            error: errorDetail,
          });
        } else if (doc.doc?._source) {
          successfulCount++;
          successfulDocuments.push(doc.doc._source);
        }
      });

      const failedCount = failedSamples.length;
      const totalSamples = samples.length;
      const successRate = totalSamples > 0 ? (successfulCount / totalSamples) * 100 : 0;

      const summaryMessage =
        failedCount === 0
          ? `Pipeline validation successful! All ${totalSamples} samples processed correctly.`
          : `Pipeline validation completed with ${successfulCount}/${totalSamples} successful (${successRate.toFixed(1)}%).`;

      const sampledOutputs = pickRandomSamples(successfulDocuments, MAX_SAMPLE_OUTPUTS).map(
        (doc, i) => {
          const source = { ...(doc as Record<string, unknown>) };
          for (const strippedField of STRIPPED_OUTPUT_FIELDS) {
            const dotIdx = strippedField.indexOf('.');
            if (dotIdx !== -1) {
              const root = strippedField.substring(0, dotIdx);
              const child = strippedField.substring(dotIdx + 1);
              const rootObj = source[root];
              if (rootObj != null && typeof rootObj === 'object' && !Array.isArray(rootObj)) {
                const copy = { ...(rootObj as Record<string, unknown>) };
                delete copy[child];
                if (Object.keys(copy).length === 0) {
                  delete source[root];
                } else {
                  source[root] = copy;
                }
              }
            } else {
              delete source[strippedField];
            }
          }
          return { sample_index: i, source };
        }
      );

      const errorGroups = groupErrors(failedSamples);

      const ecsWarnings: string[] = [];
      for (const doc of successfulDocuments.slice(0, 20)) {
        const source = doc as Record<string, unknown>;
        const categories = asArray(getNestedValue(source, 'event.category'));
        const types = asArray(getNestedValue(source, 'event.type'));

        for (const category of categories) {
          const allowed = ECS_EVENT_TYPES_PER_CATEGORY[category];
          if (!allowed) {
            ecsWarnings.push(`Invalid event.category: "${category}"`);
          } else {
            for (const type of types) {
              if (!allowed.includes(type)) {
                ecsWarnings.push(
                  `event.type "${type}" is not valid for event.category "${category}". Allowed: ${allowed.join(', ')}`
                );
              }
            }
          }
        }

        const eventKind = getNestedValue(source, 'event.kind');
        if (typeof eventKind === 'string' && !VALID_EVENT_KINDS.has(eventKind)) {
          ecsWarnings.push(
            `Invalid event.kind: "${eventKind}". Valid values: ${[...VALID_EVENT_KINDS].join(', ')}`
          );
        }
      }

      const hasTimestamp = successfulDocuments.some(
        (doc) => (doc as Record<string, unknown>)['@timestamp'] != null
      );
      if (!hasTimestamp && successfulDocuments.length > 0) {
        ecsWarnings.push('@timestamp is not set in any processed document');
      }

      const uniqueEcsWarnings = [...new Set(ecsWarnings)];

      const fieldNamingErrors: string[] = [];
      for (const doc of successfulDocuments.slice(0, 20)) {
        const source = doc as Record<string, unknown>;
        const fieldPaths = flattenKeys(source);

        for (const fieldPath of fieldPaths) {
          if (ignoredFieldSet.has(fieldPath)) continue;
          if (ecsFieldSet.has(fieldPath)) continue;

          const dotIndex = fieldPath.indexOf('.');
          const root = dotIndex !== -1 ? fieldPath.substring(0, dotIndex) : fieldPath;

          if (ecsRootSet.has(root)) {
            fieldNamingErrors.push(
              `Field '${fieldPath}' is under ECS root '${root}' but is not a valid ECS field. ` +
                `Custom fields under ECS paths are not allowed. ` +
                `Either use a valid ECS field or rename to '${customFieldPrefix}${fieldPath.substring(dotIndex + 1)}'.`
            );
          } else if (!fieldPath.startsWith(customFieldPrefix)) {
            fieldNamingErrors.push(
              `Field '${fieldPath}' is not an ECS field and is not properly namespaced. ` +
                `Non-ECS fields must use the format '${customFieldPrefix}<field_name>'.`
            );
          }
        }
      }

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
