/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import {
  dateProcessorSchema,
  dissectProcessorSchema,
  grokProcessorSchema,
  removeProcessorSchema,
  renameProcessorSchema,
  convertProcessorSchema,
} from '@kbn/streamlang';

const ACTION_TO_SCHEMA: Record<string, z.ZodType> = {
  grok: grokProcessorSchema,
  dissect: dissectProcessorSchema,
  date: dateProcessorSchema,
  remove: removeProcessorSchema,
  rename: renameProcessorSchema,
  convert: convertProcessorSchema,
};

/**
 * Narrows Zod union validation errors to only the issues relevant to each step's
 * intended `action` type. Without this, a union of 6 processor schemas produces
 * errors for all 6 variants even when only one is relevant — flooding the LLM
 * with noise.
 *
 * When `allowedActions` is provided, steps whose action is not in the set are
 * reported as disallowed rather than validated against the full schema.
 */
export function formatZodPipelineErrors(
  error: z.ZodError,
  input: unknown,
  allowedActions?: Set<string>
): Array<{ stepIndex: number; action: string; message: string }> {
  const steps = extractSteps(input);
  const results: Array<{ stepIndex: number; action: string; message: string }> = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const action = extractAction(step);

    if (action && allowedActions && !allowedActions.has(action)) {
      results.push({
        stepIndex: i,
        action,
        message: `Processor action "${action}" is not allowed in this pipeline schema. Allowed actions: ${[
          ...allowedActions,
        ].join(', ')}`,
      });
      continue;
    }

    const schema = action ? ACTION_TO_SCHEMA[action] : undefined;

    if (schema) {
      const singleResult = schema.safeParse(step);
      if (!singleResult.success) {
        for (const issue of singleResult.error.issues) {
          results.push({
            stepIndex: i,
            action: action ?? 'unknown',
            message: formatIssue(issue),
          });
        }
      }
    } else {
      results.push({
        stepIndex: i,
        action: action ?? 'unknown',
        message: `Unknown processor action "${action ?? String(step)}"`,
      });
    }
  }

  if (results.length === 0) {
    for (const issue of error.issues) {
      results.push({
        stepIndex: -1,
        action: 'pipeline',
        message: formatIssue(issue),
      });
    }
  }

  return results;
}

function extractSteps(input: unknown): unknown[] {
  if (typeof input !== 'object' || input === null) return [];
  const obj = input as Record<string, unknown>;
  if (Array.isArray(obj.steps)) return obj.steps;
  return [];
}

function extractAction(step: unknown): string | undefined {
  if (typeof step !== 'object' || step === null) return undefined;
  const obj = step as Record<string, unknown>;
  if (typeof obj.action === 'string') return obj.action;
  return undefined;
}

function formatIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
  return `${path}: ${issue.message}`;
}
