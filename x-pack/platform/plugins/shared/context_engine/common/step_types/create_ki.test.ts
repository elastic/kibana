/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_VALID_SYNTAX_VERIFIER_ID } from '../ki_verification';
import { createKiInputSchema, createKiOutputSchema } from './create_ki';

const BASE = { ai_index_id: 'my-ai-index', ki: { type: 'detection', title: 'Failed logins' } };

describe('createKiInputSchema', () => {
  it('accepts a KI without verifiers', () => {
    expect(createKiInputSchema.safeParse(BASE).success).toBe(true);
  });

  it('accepts built-in ids mixed with custom verifier workflows', () => {
    const result = createKiInputSchema.safeParse({
      ...BASE,
      verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID, { workflow_id: 'no-pii' }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty verifiers list', () => {
    expect(createKiInputSchema.safeParse({ ...BASE, verifiers: [] }).success).toBe(false);
  });

  it('rejects duplicate verifier ids', () => {
    const result = createKiInputSchema.safeParse({
      ...BASE,
      verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID, ESQL_VALID_SYNTAX_VERIFIER_ID],
    });

    expect(result.success).toBe(false);
  });
});

describe('createKiOutputSchema', () => {
  it('accepts a failed verification without an id', () => {
    const result = createKiOutputSchema.safeParse({
      verification: {
        passed: false,
        results: [{ verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: false, reason: 'x' }],
      },
    });

    expect(result.success).toBe(true);
  });
});
