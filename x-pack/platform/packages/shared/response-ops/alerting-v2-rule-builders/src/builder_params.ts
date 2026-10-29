/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderType } from './types';

export type BuilderParamsCheck<TParams> =
  | { readonly valid: true; readonly params: TParams }
  | { readonly valid: false; readonly errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Applies a params patch: each defined field replaces the current value wholesale and
 * `null` removes it. The result is unchecked; pass it to {@link checkBuilderParams}.
 */
export const applyParamsPatch = (current: unknown, patch: unknown): Record<string, unknown> => {
  const next: Record<string, unknown> = isRecord(current) ? { ...current } : {};
  if (!isRecord(patch)) {
    return next;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete next[key];
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
};

/** Parses input against the builder's params schema, then runs the builder's own validation. */
export const checkBuilderParams = <TParams, TFormState>(
  builder: RuleBuilderType<TParams, TFormState>,
  input: unknown
): BuilderParamsCheck<TParams> => {
  const parsed = builder.paramsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(
        ({ path, message }) => `${path.length > 0 ? path.join('.') : 'params'}: ${message}`
      ),
    };
  }

  const errors = builder.validate(parsed.data);
  return errors.length > 0 ? { valid: false, errors } : { valid: true, params: parsed.data };
};
