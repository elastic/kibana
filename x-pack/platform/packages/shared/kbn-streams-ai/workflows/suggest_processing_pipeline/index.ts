/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams, ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { StreamlangDSL, GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { isOtelStream } from '@kbn/streams-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SuggestIngestPipelinePrompt } from './prompt';
import { getPipelineDefinitionJsonSchema, pipelineDefinitionSchema } from './schema';

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
}): Promise<StreamlangDSL | null> {
  // No need to involve reasoning if there are no sample documents
  if (documents.length === 0) {
    return null;
  }

  // Collect metrics for the initial pipeline
  const isOtel = isOtelStream(definition);
  const mappedFields = await getMappedFields(esClient, definition.name);
  const simulationResult = await simulatePipeline({
    steps: parsingProcessor ? [parsingProcessor] : [],
  });
  const simulationMetrics = await getSimulationMetrics(
    simulationResult,
    fieldsMetadataClient,
    isOtel,
    mappedFields
  );

  // Invoke the reasoning agent to suggest the ingest pipeline
  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestIngestPipelinePrompt,
    input: {
      stream: definition,
      fields_schema: isOtel
        ? `OpenTelemetry (OTel) semantic convention for log records`
        : 'Elastic Common Schema (ECS)',
      pipeline_schema: JSON.stringify(getPipelineDefinitionJsonSchema(pipelineDefinitionSchema)),
      initial_dataset_analysis: JSON.stringify(simulationMetrics),
      parsing_processor: parsingProcessor ? JSON.stringify(parsingProcessor) : undefined,
    },
    maxSteps,
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

        // 2. Simulate the pipeline and collect metrics
        const simulateResult = await simulatePipeline(pipeline.data as StreamlangDSL);
        const metrics = await getSimulationMetrics(
          simulateResult,
          fieldsMetadataClient,
          isOtel,
          mappedFields
        );

        return {
          response: {
            valid: true,
            errors: undefined,
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

  const commitPipeline = pipelineDefinitionSchema.safeParse(
    response.toolCalls[0].function.arguments.pipeline
  );
  if (!commitPipeline.success) {
    return null;
  }

  return commitPipeline.data as StreamlangDSL;
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
