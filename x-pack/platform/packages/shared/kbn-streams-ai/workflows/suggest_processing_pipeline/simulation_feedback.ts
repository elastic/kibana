/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord, ProcessingSimulationResponse } from '@kbn/streams-schema';

export interface SimulationFeedback {
  valid: boolean;
  errors?: (string | { message: string; path: PropertyKey[] })[];
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

export interface CommitFeedback {
  committed: boolean;
  errors?: { message: string; path: PropertyKey[] }[];
  [key: string]: unknown;
}

/**
 * Detects temporary fields (custom.* or attributes.custom.*) in the simulation output.
 * Returns an array of temporary field names found across all documents.
 *
 * @param simulationResult - The processing simulation response from the streams API
 * @returns Array of temporary field names detected in the simulation output
 */
export function detectTemporaryFields(simulationResult: ProcessingSimulationResponse): string[] {
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
 * Collects errors attributed to a specific processor from the simulation results.
 *
 * @param simulationResult - The processing simulation response from the streams API
 * @param processorId - The ID of the processor to collect errors for
 * @returns Array of unique error messages for the specified processor
 */
export function collectErrorsForProcessor(
  simulationResult: ProcessingSimulationResponse,
  processorId: string
): string[] {
  const errors: string[] = [];
  if (!simulationResult.documents) {
    return errors;
  }
  for (const doc of simulationResult.documents) {
    if (doc.errors && doc.errors.length > 0) {
      for (const error of doc.errors) {
        if ('processor_id' in error && error.processor_id === processorId) {
          const errorMsg = error.type + ': ' + error.message;
          if (!errors.includes(errorMsg)) {
            errors.push(errorMsg);
          }
        }
      }
    }
  }
  return errors;
}

/**
 * Builds structured feedback from simulation results with per-processor attribution.
 *
 * @param simulationResult - The processing simulation response from the streams API
 * @param metrics - Metrics object containing sampled count, fields array, and parse rate
 * @param uniqueErrors - Array of unique document-level errors
 * @returns Structured simulation feedback with validity, errors, metrics, and processor details
 */
export function buildSimulationFeedback(
  simulationResult: ProcessingSimulationResponse,
  metrics: { sampled: number; fields: string[]; parse_rate: number },
  uniqueErrors: string[]
): SimulationFeedback {
  const minParseRate = 80;
  const maxFailureRate = 0.2;
  const errors: string[] = [];
  const processors: Record<string, { failed_rate: number; errors?: string[] }> = {};

  if (metrics.parse_rate < minParseRate) {
    errors.push(
      'Parse rate is too low: ' +
        metrics.parse_rate.toFixed(2) +
        '% (minimum required: ' +
        minParseRate +
        '%). The pipeline is not extracting fields from enough documents.'
    );
  }

  if (simulationResult.processors_metrics) {
    for (const [processorId, processorMetrics] of Object.entries(
      simulationResult.processors_metrics
    )) {
      if (!processorMetrics) continue;
      const processorErrors: string[] = [];
      if (processorMetrics.failed_rate > maxFailureRate) {
        const failurePercentage = (processorMetrics.failed_rate * 100).toFixed(2);
        const errorMsg =
          '[' +
          processorId +
          '] Failure rate is ' +
          failurePercentage +
          '% (maximum allowed: 20%).';
        processorErrors.push(errorMsg);
        errors.push(errorMsg);
      }
      const docErrors = collectErrorsForProcessor(simulationResult, processorId);
      for (const docError of docErrors.slice(0, 3)) {
        const prefixedError = '[' + processorId + '] ' + docError;
        if (!processorErrors.includes(prefixedError)) processorErrors.push(prefixedError);
        if (!errors.includes(prefixedError)) errors.push(prefixedError);
      }
      processors[processorId] = {
        failed_rate: processorMetrics.failed_rate,
        errors: processorErrors.length > 0 ? processorErrors : undefined,
      };
    }
  }

  for (const uniqueError of uniqueErrors) {
    if (!errors.includes(uniqueError)) errors.push(uniqueError);
  }

  const temporaryFields = detectTemporaryFields(simulationResult);
  if (temporaryFields.length > 0) {
    const tempFieldMsg =
      'Temporary fields detected: ' +
      temporaryFields.join(', ') +
      '. These should be removed or renamed.';
    errors.push(tempFieldMsg);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    metrics,
    processors: Object.keys(processors).length > 0 ? processors : undefined,
  };
}

/**
 * Collects unique document errors with counts from the simulation results.
 *
 * @param simulationResult - The processing simulation response from the streams API
 * @returns Array of formatted unique error messages with occurrence counts
 */
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
