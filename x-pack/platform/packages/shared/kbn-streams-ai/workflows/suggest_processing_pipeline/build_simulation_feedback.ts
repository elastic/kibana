/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FlattenRecord,
  ProcessingSimulationResponse,
  SimulationError,
} from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';

export interface SimulationFeedback {
  valid: boolean;
  errors: string[];
  metrics: {
    sampled: number;
    fields: string[];
    parse_rate: number;
  };
  processors: Record<
    string,
    {
      failure_rate: number;
      top_errors: string[];
    }
  >;
  temporary_fields: string[];
}

/**
 * Builds a structured simulation feedback object used by both the initial dataset
 * analysis and the `simulate_pipeline` tool callback. Returns a consistent shape:
 * `{ valid, errors, metrics, processors, temporary_fields }`.
 */
export async function buildSimulationFeedback({
  simulationResult,
  fieldsMetadataClient,
  isOtel,
  mappedFields,
  getFieldSummary,
}: {
  simulationResult: ProcessingSimulationResponse;
  fieldsMetadataClient: IFieldsMetadataClient;
  isOtel: boolean;
  mappedFields: Record<string, string>;
  getFieldSummary: (
    docs: FlattenRecord[],
    fieldsMetadataClient: IFieldsMetadataClient,
    isOtel: boolean,
    mappedFields: Record<string, string>
  ) => Promise<string[]>;
}): Promise<SimulationFeedback> {
  if (simulationResult.definition_error || simulationResult.documents.length === 0) {
    return {
      valid: false,
      errors: [
        simulationResult.definition_error?.message ??
          'Simulation returned no documents. The pipeline may be dropping all documents.',
      ],
      metrics: { sampled: 0, fields: [], parse_rate: 0 },
      processors: {},
      temporary_fields: [],
    };
  }

  const documents = simulationResult.documents;
  const sampled = documents.length;
  const parseRate = simulationResult.documents_metrics.parsed_rate * 100;

  const flattenedDocs = documents
    .map((d) => d.value)
    .filter((v): v is FlattenRecord => v != null && typeof v === 'object');

  const fields = await getFieldSummary(flattenedDocs, fieldsMetadataClient, isOtel, mappedFields);

  const metrics = {
    sampled,
    fields,
    parse_rate: parseFloat(parseRate.toFixed(2)),
  };

  const processors = buildPerProcessorBreakdown(simulationResult);
  const temporaryFields = detectTemporaryFields(flattenedDocs);
  const processorFailures = validateProcessorFailureRates(simulationResult);
  const uniqueErrors = getUniqueDocumentErrorsWithAttribution(simulationResult);

  const errors: string[] = [...processorFailures, ...uniqueErrors];

  // temporary_fields are informational only — they're surfaced in the
  // `temporary_fields` array for the LLM to act on, but do NOT gate `valid`.
  // This prevents burning a simulation step when upstream parsing creates
  // custom.* fields that are always present on the first iteration.

  return {
    valid: errors.length === 0,
    errors,
    metrics,
    processors,
    temporary_fields: temporaryFields,
  };
}

/** Extracts the processor_id from a SimulationError if available. */
function getErrorProcessorId(error: SimulationError): string | undefined {
  if ('processor_id' in error && typeof error.processor_id === 'string') {
    return error.processor_id;
  }
  return undefined;
}

function buildPerProcessorBreakdown(
  simulationResult: ProcessingSimulationResponse
): Record<string, { failure_rate: number; top_errors: string[] }> {
  const result: Record<string, { failure_rate: number; top_errors: string[] }> = {};

  if (!simulationResult.processors_metrics) return result;

  for (const [processorId, metrics] of Object.entries(simulationResult.processors_metrics)) {
    if (!metrics) continue;
    result[processorId] = {
      failure_rate: parseFloat((metrics.failed_rate * 100).toFixed(2)),
      top_errors: [],
    };
  }

  const errorMap = new Map<string, Map<string, number>>();

  for (const doc of simulationResult.documents) {
    if (!doc.errors || doc.errors.length === 0) continue;

    for (const error of doc.errors) {
      const key = `${error.type}: ${error.message}`;
      // Use error.processor_id when available (authoritative attribution)
      const attributedProcessorId = getErrorProcessorId(error);

      if (attributedProcessorId) {
        // Error carries its own processor_id — attribute directly
        if (!result[attributedProcessorId]) continue;
        if (!errorMap.has(attributedProcessorId)) {
          errorMap.set(attributedProcessorId, new Map());
        }
        const inner = errorMap.get(attributedProcessorId)!;
        inner.set(key, (inner.get(key) ?? 0) + 1);
      } else {
        // Error type doesn't carry processor_id (e.g. field_mapping_failure)
        // Fall back to processed_by, but only attribute to processors that actually
        // appear in the processors_metrics (i.e. are part of this pipeline)
        const processedBy = doc.processed_by ?? [];
        for (const processorId of processedBy) {
          if (!result[processorId]) continue;
          if (!errorMap.has(processorId)) {
            errorMap.set(processorId, new Map());
          }
          const inner = errorMap.get(processorId)!;
          inner.set(key, (inner.get(key) ?? 0) + 1);
        }
        // When processed_by is empty and no processor_id, the error is unattributed —
        // do NOT spray it across every processor
      }
    }
  }

  for (const [processorId, inner] of errorMap.entries()) {
    if (!result[processorId]) continue;
    const sorted = [...inner.entries()].sort((a, b) => b[1] - a[1]);
    result[processorId].top_errors = sorted.slice(0, 3).map(([msg, count]) => {
      const suffix = count > 1 ? ` (occurred in ${count} documents)` : '';
      const truncated = msg.length > 200 ? `${msg.substring(0, 200)}...` : msg;
      return `${processorId}: ${truncated}${suffix}`;
    });
  }

  return result;
}

function validateProcessorFailureRates(simulationResult: ProcessingSimulationResponse): string[] {
  const errors: string[] = [];
  const maxFailureRate = 0.2;

  if (!simulationResult.processors_metrics) return errors;

  for (const [processorId, metrics] of Object.entries(simulationResult.processors_metrics)) {
    if (!metrics) continue;
    if (metrics.failed_rate > maxFailureRate) {
      const failurePercentage = (metrics.failed_rate * 100).toFixed(2);
      errors.push(
        `Processor "${processorId}" has a failure rate of ${failurePercentage}% (maximum allowed: 20%). Review the processor configuration.`
      );
    }
  }

  return errors;
}

const TEMPORARY_FIELD_PATTERNS = [/^custom\./, /^attributes\.custom\./];

export function detectTemporaryFields(documents: FlattenRecord[]): string[] {
  const temporaryFields = new Set<string>();

  for (const doc of documents) {
    if (!doc) continue;
    for (const fieldName of Object.keys(doc)) {
      if (TEMPORARY_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName))) {
        temporaryFields.add(fieldName);
      }
    }
  }

  return [...temporaryFields].sort();
}

function getUniqueDocumentErrorsWithAttribution(
  simulationResult: ProcessingSimulationResponse
): string[] {
  if (!simulationResult.documents || simulationResult.documents.length === 0) return [];

  const errorMap = new Map<string, { count: number; processorIds: Set<string> }>();

  for (const doc of simulationResult.documents) {
    if (!doc.errors || doc.errors.length === 0) continue;

    for (const error of doc.errors) {
      const key = `${error.type}: ${error.message}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, { count: 0, processorIds: new Set() });
      }
      const entry = errorMap.get(key)!;
      entry.count++;

      // Use error.processor_id when available (authoritative attribution)
      const attributedProcessorId = getErrorProcessorId(error);
      if (attributedProcessorId) {
        entry.processorIds.add(attributedProcessorId);
      } else {
        // Fall back to processed_by for error types without processor_id
        const processedBy = doc.processed_by ?? [];
        for (const id of processedBy) {
          entry.processorIds.add(id);
        }
        // When processed_by is empty and no processor_id, the error is unattributed —
        // do NOT spray it across every processor
      }
    }
  }

  const uniqueErrors: string[] = [];
  const maxErrors = 5;
  const maxErrorLength = 250;
  let errorIndex = 0;

  for (const [errorKey, errorInfo] of errorMap.entries()) {
    if (errorIndex >= maxErrors) break;

    const attribution =
      errorInfo.processorIds.size > 0 ? `[${[...errorInfo.processorIds].join(', ')}] ` : '';
    const countStr = errorInfo.count > 1 ? ` (occurred in ${errorInfo.count} documents)` : '';
    const fullError = `${attribution}${errorKey}${countStr}`;

    const truncatedError =
      fullError.length > maxErrorLength
        ? `${fullError.substring(0, maxErrorLength)}...`
        : fullError;

    uniqueErrors.push(truncatedError);
    errorIndex++;
  }

  const remainingErrors = errorMap.size - maxErrors;
  if (remainingErrors > 0) {
    uniqueErrors.push(`... and ${remainingErrors} more error(s)`);
  }

  return uniqueErrors;
}
