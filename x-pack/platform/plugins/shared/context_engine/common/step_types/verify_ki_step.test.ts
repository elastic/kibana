/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KI_ATTRIBUTES, MAX_KI_ATTRIBUTE_VALUE_LENGTH } from './ki';
import {
  ESQL_VALID_RUNTIME_VERIFIER_ID,
  ESQL_VALID_SYNTAX_VERIFIER_ID,
  KI_VERIFIER_IDS,
} from '../ki_verification';
import { VerifyKiInputSchema } from './verify_ki_step';

const BASE = { verifiers: [ESQL_VALID_RUNTIME_VERIFIER_ID] };

describe('VerifyKiInputSchema', () => {
  it('accepts a KI with esql attributes', () => {
    const result = VerifyKiInputSchema.safeParse({
      ...BASE,
      ki: { type: 'detection', attributes: { esql: 'FROM logs-* | LIMIT 1' } },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a KI without esql attributes', () => {
    const result = VerifyKiInputSchema.safeParse({
      ...BASE,
      ki: { type: 'detection', title: 'no esql', attributes: { severity: 'high' } },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a KI without any attributes', () => {
    const result = VerifyKiInputSchema.safeParse({ ...BASE, ki: { type: 'detection' } });

    expect(result.success).toBe(true);
  });

  it('rejects a missing verifiers list', () => {
    const result = VerifyKiInputSchema.safeParse({ ki: { type: 'detection' } });

    expect(result.success).toBe(false);
  });

  it('rejects an empty verifiers list', () => {
    const result = VerifyKiInputSchema.safeParse({ ki: { type: 'detection' }, verifiers: [] });

    expect(result.success).toBe(false);
  });

  it.each(KI_VERIFIER_IDS)('accepts the built-in verifier id %s', (verifier) => {
    const result = VerifyKiInputSchema.safeParse({
      ki: { type: 'detection' },
      verifiers: [verifier],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown verifier id', () => {
    const result = VerifyKiInputSchema.safeParse({
      ki: { type: 'detection' },
      verifiers: ['unknown-verifier'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate verifier ids', () => {
    const result = VerifyKiInputSchema.safeParse({
      ki: { type: 'detection' },
      verifiers: [
        ESQL_VALID_SYNTAX_VERIFIER_ID,
        ESQL_VALID_RUNTIME_VERIFIER_ID,
        ESQL_VALID_SYNTAX_VERIFIER_ID,
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Verifier ids must be unique.',
        }),
      ])
    );
  });

  it('rejects attributes with too many entries', () => {
    const attributes = Object.fromEntries(
      Array.from({ length: MAX_KI_ATTRIBUTES + 1 }, (_, i) => [`key${i}`, 'v'])
    );

    const result = VerifyKiInputSchema.safeParse({ ...BASE, ki: { attributes } });

    expect(result.success).toBe(false);
  });

  it('rejects attribute values above the length cap', () => {
    const result = VerifyKiInputSchema.safeParse({
      ...BASE,
      ki: { attributes: { esql: 'x'.repeat(MAX_KI_ATTRIBUTE_VALUE_LENGTH + 1) } },
    });

    expect(result.success).toBe(false);
  });
});
