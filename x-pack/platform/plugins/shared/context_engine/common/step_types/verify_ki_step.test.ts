/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KI_ATTRIBUTES, MAX_KI_ATTRIBUTE_VALUE_LENGTH } from './ki';
import { VerifyKiInputSchema } from './verify_ki_step';

describe('VerifyKiInputSchema', () => {
  it('accepts a KI with esql attributes', () => {
    const result = VerifyKiInputSchema.safeParse({
      ki: { type: 'detection', attributes: { esql: 'FROM logs-* | LIMIT 1' } },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a KI without esql attributes', () => {
    const result = VerifyKiInputSchema.safeParse({
      ki: { type: 'detection', title: 'no esql', attributes: { severity: 'high' } },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a KI without any attributes', () => {
    const result = VerifyKiInputSchema.safeParse({ ki: { type: 'detection' } });

    expect(result.success).toBe(true);
  });

  it('rejects attributes with too many entries', () => {
    const attributes = Object.fromEntries(
      Array.from({ length: MAX_KI_ATTRIBUTES + 1 }, (_, i) => [`key${i}`, 'v'])
    );

    const result = VerifyKiInputSchema.safeParse({ ki: { attributes } });

    expect(result.success).toBe(false);
  });

  it('rejects attribute values above the length cap', () => {
    const result = VerifyKiInputSchema.safeParse({
      ki: { attributes: { esql: 'x'.repeat(MAX_KI_ATTRIBUTE_VALUE_LENGTH + 1) } },
    });

    expect(result.success).toBe(false);
  });
});
