/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams } from '@kbn/streams-schema';
import type { StreamlangDSL, GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import type { simulateProcessing } from '@kbn/streams-plugin/server/routes/internal/streams/processing/simulation_handler';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { SuggestIngestPipelinePrompt } from './prompt';
import { getPipelineDefinitionJsonSchema, pipelineDefinitionSchema } from './schema';
import taskPromptTemplate from './task_prompt.text';

export async function suggestProcessingPipeline({
  definition,
  inferenceClient,
  esClient,
  logger,
  parsingProcessor,
  start,
  end,
  maxSteps,
  signal,
  simulatePipeline,
  documents,
  fieldsMetadataClient,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  parsingProcessor?: GrokProcessor | DissectProcessor;
  start: number;
  end: number;
  maxSteps?: number | undefined;
  signal: AbortSignal;
  simulatePipeline(pipeline: StreamlangDSL): ReturnType<typeof simulateProcessing>;
  documents: FlattenRecord[];
  fieldsMetadataClient: IFieldsMetadataClient;
}): Promise<StreamlangDSL | null> {
  // Get initial dataset analysis similar to identifyFeatures
  // const initialAnalysis = await describeDataset({
  //   esClient,
  //   start,
  //   end,
  //   index: definition.name,
  // });
  // console.log('initialAnalysis', initialAnalysis);
  // const datasetAnalysis = initialAnalysis;
  // const truncatedAnalysis = sortAndTruncateAnalyzedFields(datasetAnalysis, {
  //   dropEmpty: true,
  //   dropUnmapped: false,
  // });
  // console.log('Truncated dataset analysis', truncatedAnalysis);

  // No need to involve reasoning if there are no sample documents
  if (documents.length === 0) {
    return null;
  }
  console.log('parsingProcessor', parsingProcessor);

  // Collect metrics for the initial pipeline
  const simulationResult = await simulatePipeline({
    steps: parsingProcessor ? [parsingProcessor] : [],
  });
  const simulationMetrics = await getSimulationMetrics(simulationResult, fieldsMetadataClient);
  console.log('simulationMetrics', simulationMetrics);

  // Invoke the reasoning agent to suggest the ingest pipeline
  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestIngestPipelinePrompt,
    input: {
      stream: definition,
      pipeline_schema: JSON.stringify(getPipelineDefinitionJsonSchema(pipelineDefinitionSchema)),
      initial_dataset_analysis: JSON.stringify(simulationMetrics),
      task_description: taskPromptTemplate,
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
        const simulateResult = await simulatePipeline(pipeline.data);
        const metrics = await getSimulationMetrics(simulateResult, fieldsMetadataClient);

        console.log('--------------------------------');
        console.log('validatedPipeline', pipeline.data);
        // console.log('simulateResult', simulateResult);
        console.log('metrics', metrics);

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
  console.log('response', response);
  console.log('response.toolCalls', response.toolCalls);

  const commitPipeline = pipelineDefinitionSchema.safeParse(
    response.toolCalls[0].function.arguments.pipeline
  );
  if (!commitPipeline.success) {
    return null;
  }

  return commitPipeline.data;
}

// {
//   total: 4810,
//   sampled: 1000,
//   fields: [
//     '@timestamp:date - 889 distinct values',
//     'attributes.filepath:(unnmapped) - 1 distinct values (`Apache.log`)',
//     'attributes.process.name:(unnmapped) - 2 distinct values (`apache2`, `httpd`)',
//     'attributes.user.name:(unnmapped) - 3 distinct values (`admin`, `user`, `guest`)',
//     'body.text:text - 1000 distinct values (`[Tue Oct 28 12:16:02 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties`, `[Tue Oct 28 11:30:11 2025] [error] mod_jk child workerEnv in error state 6`, 998 more values)',
//     'host.name:keyword - 3 distinct values (`server2`, `server1`, `server3`)',
//     'message:text - 1000 distinct values (`[Tue Oct 28 12:16:02 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties`, `[Tue Oct 28 11:30:11 2025] [error] mod_jk child workerEnv in error state 6`, 998 more values)',
//     'resource.attributes.host.name:keyword - 3 distinct values (`server2`, `server1`, `server3`)',
//     'resource.attributes.process.pid:(unnmapped) - 960 distinct values (`8446`, `9743`, `266`, `3441`, `4052`, `3674`, `8201`, `1874`, `9095`, `3046`, 950 more values)',
//     'stream.name:keyword - 1 distinct values (`logs.apache`)'
//   ]
// }
async function getSimulationMetrics(
  simulationResult: Awaited<ReturnType<typeof simulateProcessing>>,
  fieldsMetadataClient: IFieldsMetadataClient
) {
  // Metrics:
  // - Success/Parsed rate
  // - Timestamp coverage
  // - Message coverage
  // - Type correctness
  // - ECS/non-ECS fields

  // Handle failure case
  if (simulationResult.definition_error || simulationResult.documents.length === 0) {
    return {
      total: 0,
      sampled: 0,
      fields: [],
      success_rate: 0,
      timestamp_coverage: 0,
      message_coverage: 0,
    };
  }

  // const sortedFields = sortAndTruncateAnalyzedFields(simulationResult);

  const documents = simulationResult.documents;
  const total = documents.length;
  const sampled = documents.length;

  // Calculate success/parsed rate
  const successRate = simulationResult.documents_metrics.parsed_rate * 100;

  // Calculate timestamp coverage
  const documentsWithTimestamp = documents.filter(
    (doc) => doc.value && '@timestamp' in doc.value && doc.value['@timestamp'] != null
  ).length;
  const timestampCoverage = total > 0 ? (documentsWithTimestamp / total) * 100 : 0;

  // Calculate message coverage
  const documentsWithMessage = documents.filter(
    (doc) =>
      doc.value &&
      (('message' in doc.value && doc.value.message != null) ||
        ('log.message' in doc.value && doc.value['log.message'] != null))
  ).length;
  const messageCoverage = total > 0 ? (documentsWithMessage / total) * 100 : 0;

  // Collect all unique fields from all documents
  const fieldMap = new Map<
    string,
    { values: Set<string | number | boolean | null>; types: Set<string> }
  >();

  for (const doc of documents) {
    if (doc.value) {
      for (const [fieldName, fieldValue] of Object.entries(doc.value)) {
        if (!fieldMap.has(fieldName)) {
          fieldMap.set(fieldName, { values: new Set(), types: new Set() });
        }
        const fieldInfo = fieldMap.get(fieldName)!;

        // Store sample values (limit to avoid memory issues)
        if (fieldInfo.values.size < 100) {
          if (fieldValue != null) {
            const stringValue = String(fieldValue);
            // Truncate long values
            fieldInfo.values.add(
              stringValue.length > 100 ? stringValue.substring(0, 100) + '...' : stringValue
            );
          }
        }

        // Infer type from value
        if (fieldValue != null) {
          if (typeof fieldValue === 'number') {
            // Check if it's a date (timestamp)
            if (
              fieldName === '@timestamp' ||
              (typeof fieldValue === 'number' && fieldValue > 1000000000000)
            ) {
              fieldInfo.types.add('date');
            } else {
              fieldInfo.types.add('number');
            }
          } else if (typeof fieldValue === 'boolean') {
            fieldInfo.types.add('boolean');
          } else {
            fieldInfo.types.add('text');
          }
        }
      }
    }
  }

  // Check ECS status for all fields
  const fieldNames = Array.from(fieldMap.keys());
  const fieldMetadataMap = await fieldsMetadataClient.find({
    fieldNames,
    source: ['ecs', 'metadata'],
  });

  const fieldsMetadata = fieldMetadataMap.getFields();

  // Build fields array with metrics
  const fields = Array.from(fieldMap.entries()).map(([fieldName, fieldInfo]) => {
    const metadata = fieldsMetadata[fieldName];
    const isEcs = metadata?.source === 'ecs';
    const isMetadata = metadata?.source === 'metadata';
    console.log('metadata', fieldName, metadata);
    // Determine type display
    let typeDisplay = 'unknown';
    if (metadata?.type) {
      typeDisplay = metadata.type;
    } else if (fieldInfo.types.size > 0) {
      const types = Array.from(fieldInfo.types);
      typeDisplay = types.length === 1 ? types[0] : types.join('|');
    }

    // Build type display with ECS/metadata indicator
    let typeIndicator = typeDisplay;
    if (isMetadata) {
      typeIndicator = `${typeDisplay}(metadata)`;
    } else if (!isEcs && fieldInfo.types.size > 0) {
      typeIndicator = `${typeDisplay}(unmapped)`;
    }

    // Get distinct values count and samples
    const distinctValues = fieldInfo.values.size;
    const sampleValues = Array.from(fieldInfo.values).slice(0, 10);
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

    return `${fieldName}:${typeIndicator} - ${valuesDescription}`;
  });

  return {
    total,
    sampled,
    fields,
    success_rate: parseFloat(successRate.toFixed(2)),
    timestamp_coverage: parseFloat(timestampCoverage.toFixed(2)),
    message_coverage: parseFloat(messageCoverage.toFixed(2)),
  };
}
