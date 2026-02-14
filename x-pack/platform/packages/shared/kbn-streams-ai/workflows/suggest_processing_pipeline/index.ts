/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type BoundInferenceClient, MessageRole } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams, ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { StreamlangDSL, GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { isOtelStream } from '@kbn/streams-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { SuggestIngestPipelinePrompt } from './prompt';
import { getPipelineDefinitionJsonSchema, pipelineDefinitionSchema } from './schema';

export interface SuggestProcessingPipelineResult {
  pipeline: StreamlangDSL | null;
  metadata: {
    stepsUsed: number;
    maxSteps: number;
  };
}

export async function suggestProcessingPipeline({
  definition,
  inferenceClient,
  parsingProcessor,
  maxSteps,
  signal,
  simulatePipeline,
  documents,
  fieldsMetadataClient,
  esClient,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  parsingProcessor?: GrokProcessor | DissectProcessor;
  maxSteps?: number | undefined;
  signal: AbortSignal;
  simulatePipeline(pipeline: StreamlangDSL): Promise<ProcessingSimulationResponse>;
  documents: FlattenRecord[];
  fieldsMetadataClient: IFieldsMetadataClient;
  esClient: ElasticsearchClient;
}): Promise<SuggestProcessingPipelineResult> {
  const effectiveMaxSteps = maxSteps ?? 10;

  // No need to involve reasoning if there are no sample documents
  if (documents.length === 0) {
    return {
      pipeline: null,
      metadata: {
        stepsUsed: 0,
        maxSteps: effectiveMaxSteps,
      },
    };
  }

  // Collect metrics for the initial pipeline
  const isOtel = isOtelStream(definition);

  // Parallelize independent async operations
  const [mappedFields, simulationResult] = await Promise.all([
    getMappedFields(esClient, definition.name),
    simulatePipeline({
      steps: parsingProcessor ? [parsingProcessor] : [],
    }),
  ]);
  const simulationMetrics = await getSimulationMetrics(
    simulationResult,
    fieldsMetadataClient,
    isOtel,
    mappedFields
  );

  const input = {
    stream: definition,
    fields_schema: isOtel
      ? `OpenTelemetry (OTel) semantic convention for log records`
      : 'Elastic Common Schema (ECS)',
    pipeline_schema: JSON.stringify(getPipelineDefinitionJsonSchema(pipelineDefinitionSchema)),
    initial_dataset_analysis: JSON.stringify(simulationMetrics),
    parsing_processor: parsingProcessor ? JSON.stringify(parsingProcessor) : undefined,
  };

  // Invoke the reasoning agent to suggest the ingest pipeline
  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestIngestPipelinePrompt,
    input,
    maxSteps: effectiveMaxSteps,
    toolCallbacks: {
      simulate_pipeline: async (toolCall) => {
        // 1. Validate the pipeline schema
        const pipeline = pipelineDefinitionSchema.safeParse(toolCall.function.arguments.pipeline);
        if (!pipeline.success) {
          return {
            response: {
              valid: false,
              errors: pipeline.error.issues,
              metrics: undefined,
            },
          };
        }

        // 2. Add customIdentifiers to steps for proper tracking in simulation results
        const pipelineWithIdentifiers = addCustomIdentifiersToSteps(pipeline.data as StreamlangDSL);

        // 3. Simulate the pipeline and collect metrics
        const simulateResult = await simulatePipeline(pipelineWithIdentifiers);
        const metrics = await getSimulationMetrics(
          simulateResult,
          fieldsMetadataClient,
          isOtel,
          mappedFields
        );

        // Collect unique errors from simulation
        const uniqueErrors = getUniqueDocumentErrors(simulateResult);

        // 3. Validate parse rate - if below 80%, mark as invalid
        const parseRate = metrics.parse_rate;
        if (parseRate < 80) {
          return {
            response: {
              valid: false,
              errors: [
                `Parse rate is too low: ${parseRate.toFixed(
                  2
                )}% (minimum required: 80%). The pipeline is not extracting fields from enough documents. Review the processors and ensure they handle the document structure correctly.`,
                ...uniqueErrors,
              ],
              metrics,
            },
          };
        }

        // 4. Validate processor failure rates - each processor should have < 20% failure rate
        const processorFailures = validateProcessorFailureRates(simulateResult);
        if (processorFailures.length > 0) {
          return {
            response: {
              valid: false,
              errors: [...processorFailures, ...uniqueErrors],
              metrics,
            },
          };
        }

        return {
          response: {
            valid: true,
            errors: uniqueErrors.length > 0 ? uniqueErrors : undefined,
            metrics,
          },
        };
      },
      commit_pipeline: async (toolCall) => {
        const pipeline = pipelineDefinitionSchema.safeParse(toolCall.function.arguments.pipeline);
        if (!pipeline.success) {
          return {
            response: {
              committed: false,
              errors: pipeline.error.issues,
            },
          };
        }

        return {
          response: {
            committed: true,
            errors: undefined,
          },
        };
      },
    },
    finalToolChoice: {
      type: 'function',
      function: 'commit_pipeline',
    },
    abortSignal: signal,
  });

  // Count assistant messages to determine steps used
  const stepsUsed = response.input.filter(
    (message) => message.role === MessageRole.Assistant
  ).length;

  const metadata = {
    stepsUsed,
    maxSteps: effectiveMaxSteps,
  };

  // Check for empty toolCalls array (similar to #244335)
  if (!('toolCalls' in response) || response.toolCalls.length === 0) {
    throw new Error(
      i18n.translate('xpack.streams.ai.suggestProcessingPipeline.noToolCallsError', {
        defaultMessage:
          'Pipeline suggestions could not be generated from current log samples.\n\nTry fetching new sample data and re-running the suggestion.',
      })
    );
  }

  const commitPipeline = pipelineDefinitionSchema.safeParse(
    response.toolCalls[0].function.arguments.pipeline
  );
  if (!commitPipeline.success) {
    return {
      pipeline: null,
      metadata,
    };
  }

  // Add customIdentifier to each step for proper tracking in simulations
  const pipelineWithIdentifiers = addCustomIdentifiersToSteps(commitPipeline.data as StreamlangDSL);

  return {
    pipeline: pipelineWithIdentifiers,
    metadata,
  };
}

/**
 * Adds customIdentifier to each step in the pipeline for proper tracking.
 * This ensures processors are tracked correctly in simulation results.
 */
function addCustomIdentifiersToSteps(pipeline: StreamlangDSL): StreamlangDSL {
  return {
    ...pipeline,
    steps: pipeline.steps.map((step, index) => ({
      ...step,
      customIdentifier: step.customIdentifier || `${index}`,
    })),
  };
}

/**
 * Validates that each processor has a failure rate below 20%.
 * Returns an array of error messages for processors that exceed the threshold.
 */
function validateProcessorFailureRates(simulationResult: ProcessingSimulationResponse): string[] {
  const errors: string[] = [];
  const maxFailureRate = 0.2; // 20%

  if (!simulationResult.processors_metrics) {
    return errors;
  }

  for (const [processorId, metrics] of Object.entries(simulationResult.processors_metrics)) {
    if (metrics.failed_rate > maxFailureRate) {
      const failurePercentage = (metrics.failed_rate * 100).toFixed(2);
      errors.push(
        `Processor "${processorId}" has a failure rate of ${failurePercentage}% (maximum allowed: 20%). This processor is failing on too many documents. Review the processor configuration and ensure it handles the document structure correctly.`
      );
    }
  }

  return errors;
}

export function getUniqueDocumentErrors(simulationResult: ProcessingSimulationResponse): string[] {
  if (!simulationResult.documents || simulationResult.documents.length === 0) {
    return [];
  }

  // Collect all unique error messages
  const errorMap = new Map<string, { count: number; type: string; exampleDoc?: any }>();

  for (const doc of simulationResult.documents) {
    if (doc.errors && doc.errors.length > 0) {
      for (const error of doc.errors) {
        const key = `${error.type}: ${error.message}`;
        if (!errorMap.has(key)) {
          errorMap.set(key, {
            count: 1,
            type: error.type,
            exampleDoc: doc.value,
          });
        } else {
          errorMap.get(key)!.count++;
        }
      }
    }
  }

  // Format errors with counts and example context
  const uniqueErrors: string[] = [];
  const maxErrors = 5;
  const maxErrorLength = 250;
  let errorIndex = 0;

  for (const [errorKey, errorInfo] of errorMap.entries()) {
    if (errorIndex >= maxErrors) {
      break;
    }

    const countStr = errorInfo.count > 1 ? ` (occurred in ${errorInfo.count} documents)` : '';
    const fullError = `${errorKey}${countStr}`;

    // Truncate error message if it exceeds max length
    const truncatedError =
      fullError.length > maxErrorLength
        ? `${fullError.substring(0, maxErrorLength)}...`
        : fullError;

    uniqueErrors.push(truncatedError);
    errorIndex++;
  }

  // Add message if there are more errors
  const remainingErrors = errorMap.size - maxErrors;
  if (remainingErrors > 0) {
    uniqueErrors.push(`... and ${remainingErrors} more error(s)`);
  }

  return uniqueErrors;
}

async function getMappedFields(esClient: ElasticsearchClient, index: string) {
  // get mapped fields for specified index
  const fieldCaps = await esClient.fieldCaps({
    index,
    fields: '*',
  });

  const mappedFields: Record<string, string> = {};
  for (const [fieldName, typeInfo] of Object.entries(fieldCaps.fields)) {
    for (const [typeName, fieldDetails] of Object.entries(typeInfo)) {
      if (!fieldDetails.metadata_field) {
        mappedFields[fieldName] = typeName;
        break;
      }
    }
  }

  // Sort alphabetically by field name
  return Object.keys(mappedFields)
    .sort()
    .reduce<Record<string, string>>((sorted, key) => {
      sorted[key] = mappedFields[key];
      return sorted;
    }, {});
}

async function getSimulationMetrics(
  simulationResult: ProcessingSimulationResponse,
  fieldsMetadataClient: IFieldsMetadataClient,
  isOtel: boolean,
  mappedFields: Record<string, string>
) {
  if (simulationResult.definition_error || simulationResult.documents.length === 0) {
    return {
      sampled: 0,
      fields: [],
      parse_rate: 0,
    };
  }

  const documents = simulationResult.documents;
  const sampled = documents.length;

  // Calculate success/parsed rate
  const parseRate = simulationResult.documents_metrics.parsed_rate * 100;

  // Collect all unique fields and sample values from documents
  const fieldMap = new Map<string, Set<string | number | boolean | null>>();

  for (const doc of documents) {
    if (doc.value) {
      for (const [fieldName, fieldValue] of Object.entries(doc.value)) {
        if (!fieldMap.has(fieldName)) {
          fieldMap.set(fieldName, new Set());
        }
        const values = fieldMap.get(fieldName)!;

        // Store sample values (limit to avoid memory issues)
        if (values.size < 100) {
          if (fieldValue != null) {
            const stringValue = String(fieldValue);
            // Truncate long values
            values.add(
              stringValue.length > 100 ? stringValue.substring(0, 100) + '...' : stringValue
            );
          }
        }
      }
    }
  }

  // Check ECS status for all fields
  const fieldNames = Array.from(fieldMap.keys());
  const fieldMetadataMap = await fieldsMetadataClient.find({
    fieldNames,
    source: isOtel ? 'otel' : 'ecs',
  });

  const fieldsMetadata = fieldMetadataMap.getFields();

  // Build fields array with metrics
  const fields = Array.from(fieldMap.entries()).map(([fieldName, values]) => {
    const metadata = fieldsMetadata[fieldName];

    // Get actual type from mappedFields
    const actualType = mappedFields[fieldName] || 'unmapped';

    // Build type display with ECS/metadata indicator
    const typeIndicator = metadata ? `${metadata.source}: ${metadata.type}` : actualType;

    // Get distinct values count and samples
    const distinctValues = values.size;
    const sampleValues = Array.from(values).slice(0, 10);
    const remainingCount = distinctValues > 10 ? distinctValues - 10 : 0;

    let valuesDescription = '';
    if (distinctValues === 0) {
      valuesDescription = '0 distinct values';
    } else if (distinctValues === 1) {
      valuesDescription = `1 distinct value (\`${sampleValues[0]}\`)`;
    } else if (distinctValues <= 10) {
      valuesDescription = `${distinctValues} distinct values (${sampleValues
        .map((v) => `\`${v}\``)
        .join(', ')})`;
    } else {
      valuesDescription = `${distinctValues} distinct values (${sampleValues
        .map((v) => `\`${v}\``)
        .join(', ')}, ${remainingCount} more values)`;
    }

    return `${fieldName} (${typeIndicator}) - ${valuesDescription}`;
  });

  return {
    sampled,
    fields,
    parse_rate: parseFloat(parseRate.toFixed(2)),
  };
}
