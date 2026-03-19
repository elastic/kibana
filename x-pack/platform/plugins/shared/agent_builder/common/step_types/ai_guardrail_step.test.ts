/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InputSchema } from './ai_guardrail_step';

const checks = [
  {
    type: 'custom_prompt' as const,
    config: { system_prompt_details: 'Test.', inference_id: 'id' },
  },
];

describe('ai.guardrail InputSchema', () => {
  it('parses message + checks', () => {
    const r = InputSchema.safeParse({ message: 'm', checks });
    expect(r.success).toBe(true);
  });

  it('defaults on_fail to abort', () => {
    expect(InputSchema.parse({ message: 'm', checks }).on_fail).toBe('abort');
  });

  it('rejects missing message or checks', () => {
    expect(InputSchema.safeParse({ checks }).success).toBe(false);
    expect(InputSchema.safeParse({ message: 'm' }).success).toBe(false);
    expect(InputSchema.safeParse({ message: 'm', checks: [] }).success).toBe(false);
  });
});
