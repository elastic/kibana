/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import {
  streamlangDSLSchema,
  conditionSchema,
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  dropDocumentProcessorSchema,
  mathProcessorSchema,
  renameProcessorSchema,
  appendProcessorSchema,
  convertProcessorSchema,
  removeByPrefixProcessorSchema,
  removeProcessorSchema,
  replaceProcessorSchema,
  redactProcessorSchema,
  uppercaseProcessorSchema,
  lowercaseProcessorSchema,
  trimProcessorSchema,
  joinProcessorSchema,
  splitProcessorSchema,
  sortProcessorSchema,
  concatProcessorSchema,
  networkDirectionProcessorSchema,
  jsonExtractProcessorSchema,
  enrichProcessorSchema,
  manualIngestPipelineProcessorSchema,
  setProcessorSchema,
  type StreamlangDSL,
  type Condition,
} from '@kbn/streamlang';

const processorSchemasByAction: Record<string, z.ZodType<unknown>> = {
  grok: grokProcessorSchema,
  dissect: dissectProcessorSchema,
  date: dateProcessorSchema,
  drop_document: dropDocumentProcessorSchema,
  math: mathProcessorSchema,
  rename: renameProcessorSchema,
  set: setProcessorSchema,
  append: appendProcessorSchema,
  convert: convertProcessorSchema,
  remove_by_prefix: removeByPrefixProcessorSchema,
  remove: removeProcessorSchema,
  replace: replaceProcessorSchema,
  redact: redactProcessorSchema,
  uppercase: uppercaseProcessorSchema,
  lowercase: lowercaseProcessorSchema,
  trim: trimProcessorSchema,
  join: joinProcessorSchema,
  split: splitProcessorSchema,
  sort: sortProcessorSchema,
  concat: concatProcessorSchema,
  network_direction: networkDirectionProcessorSchema,
  json_extract: jsonExtractProcessorSchema,
  enrich: enrichProcessorSchema,
  manual_ingest_pipeline: manualIngestPipelineProcessorSchema,
};

const formatIssues = (issues: z.core.$ZodIssue[]): string => {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `"${issue.path.join('.')}"` : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
};

const formatStepError = (stepIndex: number, step: unknown): string => {
  if (typeof step !== 'object' || step === null) {
    return `Step ${stepIndex}: expected an object with "action" (processor) or "condition" (conditional block), got ${typeof step}.`;
  }

  const obj = step as Record<string, unknown>;

  if (typeof obj.action === 'string') {
    const schema = processorSchemasByAction[obj.action];
    if (!schema) {
      const validActions = Object.keys(processorSchemasByAction).join(', ');
      return `Step ${stepIndex}: unknown action "${obj.action}". Valid actions: ${validActions}.`;
    }
    const result = schema.safeParse(step);
    if (!result.success) {
      return `Step ${stepIndex} (${obj.action}): ${formatIssues(result.error.issues)}`;
    }
    return '';
  }

  if ('condition' in obj) {
    const condResult = conditionSchema.safeParse(obj.condition);
    if (!condResult.success) {
      return `Step ${stepIndex} (condition block): invalid condition — ${formatIssues(
        condResult.error.issues
      )}`;
    }
    return '';
  }

  return `Step ${stepIndex}: must have an "action" (processor) or "condition" (conditional block).`;
};

/**
 * Validates a parsed JSON object against the Streamlang DSL schema.
 * On success, returns { success: true, data: StreamlangDSL }.
 * On failure, returns { success: false, error: string } with a clean,
 * narrowed error message (not the full Zod union noise).
 */
export const validateProcessingJson = (
  json: unknown
): { success: true; data: StreamlangDSL } | { success: false; error: string } => {
  const quickResult = streamlangDSLSchema.safeParse(json);
  if (quickResult.success) {
    return { success: true, data: quickResult.data };
  }

  if (
    typeof json !== 'object' ||
    json === null ||
    !Array.isArray((json as { steps?: unknown }).steps)
  ) {
    return {
      success: false,
      error: 'Pipeline must be a JSON object with a "steps" array. Example: {"steps":[...]}',
    };
  }

  const { steps } = json as { steps: unknown[] };
  const errors: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const err = formatStepError(i, steps[i]);
    if (err) {
      errors.push(err);
    }
  }

  if (errors.length === 0) {
    return {
      success: false,
      error: `Invalid pipeline structure: ${formatIssues(quickResult.error.issues)}`,
    };
  }

  return { success: false, error: errors.join('\n') };
};

/**
 * Validates a parsed JSON object against the Streamlang condition schema.
 * On success, returns { success: true, data: Condition }.
 * On failure, returns { success: false, error: string } with a clean error.
 */
export const validateConditionJson = (
  json: unknown
): { success: true; data: Condition } | { success: false; error: string } => {
  const result = conditionSchema.safeParse(json);
  if (result.success) {
    return { success: true, data: result.data };
  }

  if (typeof json !== 'object' || json === null) {
    return {
      success: false,
      error: `Condition must be a JSON object. Examples: {"field":"service.name","eq":"nginx"}, {"and":[...]}, {"never":{}}`,
    };
  }

  const obj = json as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.includes('and') || keys.includes('or') || keys.includes('not')) {
    return {
      success: false,
      error: `Invalid logical condition: ${formatIssues(result.error.issues)}`,
    };
  }
  if (keys.includes('field')) {
    return {
      success: false,
      error: `Invalid filter condition: ${formatIssues(
        result.error.issues
      )}. A filter must have "field" and at least one operator (eq, neq, lt, gt, contains, startsWith, endsWith, exists, range, includes).`,
    };
  }

  return {
    success: false,
    error: `Invalid condition: ${formatIssues(
      result.error.issues
    )}. Expected one of: {"field":"...","eq":"..."}, {"and":[...]}, {"or":[...]}, {"not":{...}}, {"always":{}}, {"never":{}}`,
  };
};
