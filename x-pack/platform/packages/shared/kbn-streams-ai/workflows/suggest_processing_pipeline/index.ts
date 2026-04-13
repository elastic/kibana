/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type BoundInferenceClient, MessageRole } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { FlattenRecord, ProcessingSimulationResponse, Streams } from '@kbn/streams-schema';
import { addDeterministicCustomIdentifiers, type StreamlangDSL } from '@kbn/streamlang';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import {
  isOtelStream,
  OTEL_CONTENT_FIELD,
  ECS_CONTENT_FIELD,
  OTEL_SEVERITY_FIELD,
  ECS_SEVERITY_FIELD,
} from '@kbn/streams-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { SuggestIngestPipelinePrompt } from './prompt';
import { getPipelineDefinitionJsonSchema, type SuggestPipelineAgentSchema } from './schema';

export interface SuggestProcessingPipelineResult {
  pipeline: StreamlangDSL | null;
  metadata: {
    stepsUsed: number;
    maxSteps: number;
  };
}

interface SimulationFeedback {
  valid: boolean;
  errors?: string[];
  metrics?: {
    sampled: number;
    fields: string[];
    parse_rate: number;
  };
  processors?: Record<
    string,
    {
      failed_rate: number;
      errors?: string[];
    }
  >;
  [key: string]: unknown;
}

/**
 * Runs the ingest-pipeline suggestion agent. Callers supply the Zod schema that constrains tool
 * arguments (full vs post-parse-only), sample `documents` that match that mode, and a
 * pre-built **`initialDatasetAnalysisJson`** (document structure overview for the samples in `documents`);
 * any seed grok/dissect step is composed **outside** this function.
 */
export async function suggestProcessingPipeline({
  definition,
  inferenceClient,
  agentPipelineSchema,
  maxSteps,
  signal,
  simulatePipeline,
  documents,
  fieldsMetadataClient,
  esClient,
  initialDatasetAnalysisJson,
  mappedFields,
  upstreamSeedParsingContextMarkdown,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  agentPipelineSchema: SuggestPipelineAgentSchema;
  maxSteps?: number | undefined;
  signal: AbortSignal;
  simulatePipeline(pipeline: StreamlangDSL): Promise<ProcessingSimulationResponse>;
  documents: FlattenRecord[];
  fieldsMetadataClient: IFieldsMetadataClient;
  esClient: ElasticsearchClient;
  /** Pre-computed JSON for `initial_dataset_analysis` (field layout / sample values for `documents`). */
  initialDatasetAnalysisJson: string;
  /** Mapped fields from field_caps; callers must fetch before calling. */
  mappedFields: Record<string, string>;
  /**
   * When the caller runs an upstream grok/dissect seed step, pass a formatted description so the model
   * knows parsing already happened. Omit or leave empty when the full processor schema is used.
   */
  upstreamSeedParsingContextMarkdown?: string;
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

  const isOtel = isOtelStream(definition);

  const input = {
    stream: definition,
    fields_schema: isOtel
      ? `OpenTelemetry (OTel) semantic convention for log records`
      : 'Elastic Common Schema (ECS)',
    content_field: isOtel ? OTEL_CONTENT_FIELD : ECS_CONTENT_FIELD,
    severity_field: isOtel ? OTEL_SEVERITY_FIELD : ECS_SEVERITY_FIELD,
    pipeline_schema: JSON.stringify(getPipelineDefinitionJsonSchema(agentPipelineSchema)),
    initial_dataset_analysis: initialDatasetAnalysisJson,
    upstream_extraction_context: upstreamSeedParsingContextMarkdown ?? '',
  };

  // Invoke the reasoning agent to suggest the ingest pipeline
  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestIngestPipelinePrompt,
    input,
    maxSteps: effectiveMaxSteps,
    // `low` skips injecting `reason` / `complete` planning tools (only `simulate_pipeline` +
    // `commit_pipeline` from the prompt). `ReasoningPower` is `'low' | 'medium' | 'high'` only.
    power: 'low',
    toolCallbacks: {
      simulate_pipeline: async (toolCall) => {
        // 1. Validate the pipeline schema
        const pipeline = agentPipelineSchema.safeParse(toolCall.function.arguments.pipeline);
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
        const pipelineWithIdentifiers = addDeterministicCustomIdentifiers(
          pipeline.data as StreamlangDSL
        );

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

        // Build simulation feedback using the shared function
        const feedback = buildSimulationFeedback(simulateResult, metrics, uniqueErrors);

        return {
          response: feedback,
        };
      },
      commit_pipeline: async (toolCall) => {
        const pipeline = agentPipelineSchema.safeParse(toolCall.function.arguments.pipeline);
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

  const commitPipeline = agentPipelineSchema.safeParse(
    response.toolCalls[0].function.arguments.pipeline
  );
  if (!commitPipeline.success) {
    return {
      pipeline: null,
      metadata,
    };
  }

  return {
    pipeline: addDeterministicCustomIdentifiers(commitPipeline.data as StreamlangDSL),
    metadata,
  };
}

export type { SuggestPipelineAgentSchema } from './schema';
export {
  getPipelineDefinitionJsonSchema,
  pipelineDefinitionSchema,
  postParsePipelineDefinitionSchema,
} from './schema';
export { mergeSeedParsingProcessorIntoSuggestedPipeline } from './merge_seed_parsing_into_suggested_pipeline';
export { formatUpstreamSeedParsingContextForPromptMarkdown } from './upstream_seed_parsing_prompt';

/**
 * Builds a JSON-serializable overview of sample document structure (fields, example values, schema hints)
 * for the pipeline suggestion prompt—no ingest simulation or parse-rate semantics.
 */
export async function buildDocumentStructureOverviewForPipelinePrompt(
  documents: FlattenRecord[],
  fieldsMetadataClient: IFieldsMetadataClient,
  isOtel: boolean,
  mappedFields: Record<string, string>
): Promise<{ document_count: number; fields: string[] }> {
  const fields = await buildFieldSummaryLinesFromDocumentValues(
    documents,
    fieldsMetadataClient,
    isOtel,
    mappedFields
  );
  return {
    document_count: documents.length,
    fields,
  };
}

/** Field types from the stream index (field_caps); reused for prompt overview + simulate tool metrics. */
export async function fetchMappedFieldsForStreamProcessingSuggestions(
  esClient: ElasticsearchClient,
  streamIndexName: string
) {
  return getMappedFields(esClient, streamIndexName);
}

/**
 * Detects temporary fields (custom.* or attributes.custom.*) in the simulation output.
 * Returns an array of temporary field names found across all documents.
 */
function detectTemporaryFields(simulationResult: ProcessingSimulationResponse): string[] {
  if (!simulationResult.documents || simulationResult.documents.length === 0) {
    return [];
  }

  const temporaryFields = new Set<string>();

  for (const doc of simulationResult.documents) {
    if (!doc.value || typeof doc.value !== 'object') {
      continue;
    }

    for (const fieldName of Object.keys(doc.value)) {
      if (fieldName.startsWith('custom.') || fieldName.startsWith('attributes.custom.')) {
        temporaryFields.add(fieldName);
      }
    }
  }

  return Array.from(temporaryFields);
}

/**
 * Builds simulation feedback from simulation result.
 * Returns a consistent shape with per-processor metrics and validation status.
 */
function buildSimulationFeedback(
  simulateResult: ProcessingSimulationResponse,
  metrics: {
    sampled: number;
    fields: string[];
    parse_rate: number;
  },
  uniqueErrors: string[]
): SimulationFeedback {
  // Build per-processor feedback
  const processors: Record<string, { failed_rate: number; errors?: string[] }> = {};

  if (simulateResult.processors_metrics) {
    for (const [processorId, processorMetrics] of Object.entries(
      simulateResult.processors_metrics
    )) {
      if (!processorMetrics) continue;

      // Get top errors for this processor
      const processorErrors: string[] = [];
      if (processorMetrics.errors && processorMetrics.errors.length > 0) {
        const errorMap = new Map<string, number>();
        for (const error of processorMetrics.errors) {
          const key = error.type + ': ' + error.message;
          errorMap.set(key, (errorMap.get(key) ?? 0) + 1);
        }

        // Sort by count and take top 3 errors
        const sortedErrors = Array.from(errorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        for (const [errorKey, count] of sortedErrors) {
          const countStr = count > 1 ? ' (occurred ' + count + ' times)' : '';
          processorErrors.push('[' + processorId + '] ' + errorKey + countStr);
        }
      }

      processors[processorId] = {
        failed_rate: parseFloat((processorMetrics.failed_rate * 100).toFixed(2)),
        ...(processorErrors.length > 0 ? { errors: processorErrors } : {}),
      };
    }
  }

  // Validate parse rate - if below 80%, mark as invalid
  const parseRate = metrics.parse_rate;
  if (parseRate < 80) {
    return {
      valid: false,
      errors: [
        'Parse rate is too low: ' +
          parseRate.toFixed(2) +
          '% (minimum required: 80%). The pipeline is not extracting fields from enough documents. Review the processors and ensure they handle the document structure correctly.',
        ...uniqueErrors,
      ],
      metrics,
      processors,
    };
  }

  // Validate processor failure rates - each processor should have < 20% failure rate
  const maxFailureRate = 0.2; // 20%
  const processorFailures: string[] = [];
  if (simulateResult.processors_metrics) {
    for (const [processorId, processorMetrics] of Object.entries(
      simulateResult.processors_metrics
    )) {
      if (!processorMetrics) continue;
      if (processorMetrics.failed_rate > maxFailureRate) {
        const failurePercentage = (processorMetrics.failed_rate * 100).toFixed(2);
        processorFailures.push(
          '[' +
            processorId +
            '] Processor has a failure rate of ' +
            failurePercentage +
            '% (maximum allowed: 20%). This processor is failing on too many documents. Review the processor configuration and ensure it handles the document structure correctly.'
        );
      }
    }
  }
  if (processorFailures.length > 0) {
    return {
      valid: false,
      errors: [...processorFailures, ...uniqueErrors],
      metrics,
      processors,
    };
  }

  // Check for temporary fields in output
  const temporaryFields = detectTemporaryFields(simulateResult);
  if (temporaryFields.length > 0) {
    return {
      valid: false,
      errors: [
        'Temporary fields detected: [' +
          temporaryFields.join(', ') +
          "]. Add a 'remove' processor to clean up these intermediate parsing artifacts.",
        ...uniqueErrors,
      ],
      metrics,
      processors,
    };
  }

  return {
    valid: true,
    errors: uniqueErrors.length > 0 ? uniqueErrors : undefined,
    metrics,
    processors,
  };
}

export function getUniqueDocumentErrors(simulationResult: ProcessingSimulationResponse): string[] {
  if (!simulationResult.documents || simulationResult.documents.length === 0) {
    return [];
  }

  // Collect all unique error messages
  const errorMap = new Map<string, { count: number; type: string; exampleDoc?: FlattenRecord }>();

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

async function buildFieldSummaryLinesFromDocumentValues(
  documents: FlattenRecord[],
  fieldsMetadataClient: IFieldsMetadataClient,
  isOtel: boolean,
  mappedFields: Record<string, string>
): Promise<string[]> {
  const fieldMap = new Map<string, Set<string | number | boolean | null>>();

  for (const doc of documents) {
    if (!doc) continue;
    for (const [fieldName, fieldValue] of Object.entries(doc)) {
      if (!fieldMap.has(fieldName)) {
        fieldMap.set(fieldName, new Set());
      }
      const values = fieldMap.get(fieldName)!;

      if (values.size < 100 && fieldValue != null) {
        const stringValue = String(fieldValue);
        values.add(stringValue.length > 100 ? stringValue.substring(0, 100) + '...' : stringValue);
      }
    }
  }

  if (fieldMap.size === 0) {
    return [];
  }

  const fieldNames = Array.from(fieldMap.keys());
  const fieldMetadataMap = await fieldsMetadataClient.find({
    fieldNames,
    source: isOtel ? 'otel' : 'ecs',
  });

  const fieldsMetadata = fieldMetadataMap.getFields();

  return Array.from(fieldMap.entries()).map(([fieldName, values]) => {
    const metadata = fieldsMetadata[fieldName];
    const actualType = mappedFields[fieldName] || 'unmapped';
    const typeIndicator = metadata ? `${metadata.source}: ${metadata.type}` : actualType;

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
  const parseRate = simulationResult.documents_metrics.parsed_rate * 100;

  const flattenedDocs = documents
    .map((d) => d.value)
    .filter((v): v is FlattenRecord => v != null && typeof v === 'object');

  const fields = await buildFieldSummaryLinesFromDocumentValues(
    flattenedDocs,
    fieldsMetadataClient,
    isOtel,
    mappedFields
  );

  return {
    sampled,
    fields,
    parse_rate: parseFloat(parseRate.toFixed(2)),
  };
}
