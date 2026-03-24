/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type StreamlangDSL, isActionBlock } from '@kbn/streamlang';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { PipelineSuggestionGroundTruth } from './pipeline_suggestion_datasets';

/**
 * Metrics for evaluating pipeline suggestion quality.
 */
export interface PipelineSuggestionMetrics {
  // Parsing metrics
  parseRate: number; // 0-1
  fieldCount: number;

  // Processor metrics
  processorCount: number;
  processorTypes: Record<string, number>; // e.g., {grok: 1, date: 1, convert: 2}
  processorFailureRates: Record<string, number>; // Per-processor failure rates

  // Schema compliance (OTel only)
  otelCompliance: number; // 0-1, % of expected OTel fields present in final output

  // Field quality
  semanticFieldCoverage: number; // 0-1, % of expected semantic fields present
  typeCorrectness: number; // 0-1, % of fields with correct types

  // Pipeline efficiency
  stepCount: number;
  stepEfficiency: number; // 0-1, penalty for too many steps
  hasRedundantProcessors: boolean;

  // Overall quality
  overallQuality: number; // 0-1
}

/**
 * Calculate parse rate from simulation results.
 */
function calculateParseRate(simulation: ProcessingSimulationResponse): number {
  if (!simulation.documents_metrics) return 0;
  return simulation.documents_metrics.parsed_rate;
}

/**
 * Count distinct fields in the final output schema.
 * Uses detected_fields which represents the final schema after all processing.
 */
function countExtractedFields(simulation: ProcessingSimulationResponse): number {
  if (!simulation.detected_fields || simulation.detected_fields.length === 0) return 0;

  // Exclude metadata fields that are always present
  const metadataFields = new Set(['stream.name', '@timestamp', 'body.text']);
  return simulation.detected_fields.filter((f) => !metadataFields.has(f.name)).length;
}

/**
 * Calculate processor failure rates from simulation metrics.
 */
function calculateProcessorFailureRates(
  simulation: ProcessingSimulationResponse
): Record<string, number> {
  const failureRates: Record<string, number> = {};

  if (simulation.processors_metrics) {
    for (const [processorId, metrics] of Object.entries(simulation.processors_metrics)) {
      failureRates[processorId] = metrics.failed_rate;
    }
  }

  return failureRates;
}

/**
 * Count processor types in pipeline.
 */
function countProcessorTypes(pipeline: StreamlangDSL | null): Record<string, number> {
  const counts: Record<string, number> = {};

  if (!pipeline || !pipeline.steps) return counts;

  for (const step of pipeline.steps) {
    if (!isActionBlock(step)) continue;
    const type = step.action;
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}

/**
 * Calculate semantic field coverage (e.g., @timestamp, severity_text, attributes.*).
 * Checks actual final document structure to see which expected fields are present.
 */
function calculateSemanticFieldCoverage(
  simulation: ProcessingSimulationResponse,
  expectedFields: string[]
): number {
  if (expectedFields.length === 0) return 1.0;
  if (!simulation.documents || simulation.documents.length === 0) return 0;

  // Get a parsed document to check final field structure
  const parsedDoc = simulation.documents.find((d) => d.status === 'parsed');
  if (!parsedDoc || !parsedDoc.value) return 0;

  // Check which expected fields are present in the final document
  const finalFieldNames = new Set(Object.keys(parsedDoc.value));
  let matchCount = 0;

  for (const expected of expectedFields) {
    if (finalFieldNames.has(expected)) {
      matchCount++;
    }
  }

  return matchCount / expectedFields.length;
}

/**
 * Check if pipeline has redundant processors (e.g., multiple renames to same field).
 */
function hasRedundantProcessors(pipeline: StreamlangDSL | null): boolean {
  if (!pipeline || !pipeline.steps || pipeline.steps.length === 0) return false;

  // Check for duplicate processors with same target field
  const targetFields = new Map<string, string[]>();

  for (const step of pipeline.steps) {
    if ('to' in step && step.to) {
      const action = step.action;
      if (!targetFields.has(step.to)) {
        targetFields.set(step.to, []);
      }
      targetFields.get(step.to)!.push(action);
    }
  }

  // If any field has multiple processors writing to it, might be redundant
  for (const [_, actions] of targetFields.entries()) {
    if (actions.length > 1) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate schema compliance based on expected field names.
 * Checks actual final document structure to verify expected fields are present.
 * This includes both fields that were in the original document AND fields added by the pipeline.
 * Always expects OTel conventions (attributes.*, resource.attributes.*, etc.)
 */
function calculateSchemaCompliance(
  simulation: ProcessingSimulationResponse,
  expectedSchema: string[]
): number {
  if (expectedSchema.length === 0) return 1.0;
  if (!simulation.documents || simulation.documents.length === 0) return 0;

  // Get a parsed document to check final field structure
  const parsedDoc = simulation.documents.find((d) => d.status === 'parsed');
  if (!parsedDoc || !parsedDoc.value) return 0;

  // Check which expected schema fields are present in the final document
  const finalFieldNames = new Set(Object.keys(parsedDoc.value));
  let matchCount = 0;

  for (const expectedField of expectedSchema) {
    if (finalFieldNames.has(expectedField)) {
      matchCount++;
    }
  }

  return matchCount / expectedSchema.length;
}

/**
 * Calculate step efficiency with aggressive penalty for excessive steps.
 * Optimal step count: 3-6 steps (parsing + normalization)
 * These datasets should not require many steps.
 */
function calculateStepEfficiency(stepCount: number): number {
  if (stepCount === 0) return 0;
  if (stepCount <= 6) return 1.0;
  if (stepCount <= 8) return 0.7;
  if (stepCount <= 10) return 0.4;
  return 0.1; // Very heavy penalty for >10 steps
}

/**
 * Calculate type correctness based on detected field types.
 * Uses detected_fields which includes type information (esType/suggestedType).
 */
function calculateTypeCorrectness(
  simulation: ProcessingSimulationResponse,
  groundTruth: PipelineSuggestionGroundTruth
): number {
  if (!simulation.detected_fields || simulation.detected_fields.length === 0) return 0;

  // Check if numeric fields have appropriate types
  const numericFieldPatterns = ['status_code', 'bytes', 'pid', 'port', 'count', 'size'];
  const numericTypes = new Set(['long', 'integer', 'short', 'byte', 'double', 'float']);

  let correctTypes = 0;
  let totalChecked = 0;

  for (const detectedField of simulation.detected_fields) {
    const fieldName = detectedField.name;
    const fieldType = detectedField.esType || detectedField.suggestedType;

    for (const pattern of numericFieldPatterns) {
      if (fieldName.includes(pattern)) {
        totalChecked++;
        if (fieldType && numericTypes.has(fieldType)) {
          correctTypes++;
        }
        break;
      }
    }
  }

  return totalChecked > 0 ? correctTypes / totalChecked : 1.0;
}

/**
 * Calculate overall pipeline suggestion quality.
 */
export function calculatePipelineSuggestionMetrics(
  pipeline: StreamlangDSL | null,
  simulation: ProcessingSimulationResponse,
  groundTruth: PipelineSuggestionGroundTruth
): PipelineSuggestionMetrics {
  const parseRate = calculateParseRate(simulation);
  const fieldCount = countExtractedFields(simulation);
  const processorCount = pipeline?.steps?.length || 0;
  const processorTypes = countProcessorTypes(pipeline);
  const processorFailureRates = calculateProcessorFailureRates(simulation);

  const otelCompliance = calculateSchemaCompliance(
    simulation,
    groundTruth.schema_expectations.expected_schema_fields
  );

  const semanticFieldCoverage = calculateSemanticFieldCoverage(
    simulation,
    groundTruth.quality_thresholds.required_semantic_fields
  );

  const typeCorrectness = calculateTypeCorrectness(simulation, groundTruth);

  const stepCount = processorCount;
  const stepEfficiency = calculateStepEfficiency(stepCount);
  const hasRedundant = hasRedundantProcessors(pipeline);

  // Calculate overall quality (weighted average)
  const overallQuality =
    parseRate * 0.3 + // 30% - most important
    semanticFieldCoverage * 0.25 + // 25% - semantic fields
    otelCompliance * 0.2 + // 20% - OTel schema compliance
    typeCorrectness * 0.15 + // 15% - type correctness
    stepEfficiency * 0.1; // 10% - efficiency (includes step count penalty)

  return {
    parseRate,
    fieldCount,
    processorCount,
    processorTypes,
    processorFailureRates,
    otelCompliance,
    semanticFieldCoverage,
    typeCorrectness,
    stepCount,
    stepEfficiency,
    hasRedundantProcessors: hasRedundant,
    overallQuality,
  };
}
