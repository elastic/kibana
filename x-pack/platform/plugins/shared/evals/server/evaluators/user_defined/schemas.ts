/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { EvidenceRound } from '../evidence/types';
import type { JudgeEvidenceKey } from './types';

const MAX_REFERENCE_DATA_VALUE_LENGTH = 131072;

/**
 * The evidence a judge sees, as a schema `_evaluate` and `_validate` can check a
 * trace against. Declaring `steps` requires at least one tool call: a judge that
 * asked to see them and was handed an empty list would grade a trace it was
 * never shown.
 */
export const buildEvidenceSchema = (
  evidence: JudgeEvidenceKey[]
): z.ZodType<Partial<EvidenceRound>> | undefined => {
  if (evidence.length === 0) {
    return undefined;
  }

  const message = z.object({ message: z.string().trim().min(1) });
  const shape: Record<string, z.ZodType> = {};

  if (evidence.includes('input')) {
    shape.input = message;
  }
  if (evidence.includes('response')) {
    shape.response = message;
  }
  if (evidence.includes('steps')) {
    shape.steps = z.array(z.object({}).catchall(z.unknown())).min(1);
  }

  return z.object(shape) as unknown as z.ZodType<Partial<EvidenceRound>>;
};

/**
 * The reference data an example must carry for the judge to run. Values are
 * required strings, so an example that omits one is refused before a model is
 * called rather than judged against a blank.
 */
export const buildReferenceDataSchema = (
  keys: string[] | undefined
): z.ZodType<Record<string, unknown>> | undefined => {
  if (!keys || keys.length === 0) {
    return undefined;
  }

  const shape = Object.fromEntries(
    keys.map((key) => [key, z.string().trim().min(1).max(MAX_REFERENCE_DATA_VALUE_LENGTH)])
  );

  return z.object(shape) as unknown as z.ZodType<Record<string, unknown>>;
};
