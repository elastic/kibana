/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluateRequestBody } from './evaluators/evaluate_route.gen';
import { ValidateRequestBody } from './evaluators/validate_route.gen';

describe.each([
  ['EvaluateRequestBody', EvaluateRequestBody],
  ['ValidateRequestBody', ValidateRequestBody],
] as const)('%s', (_name, requestSchema) => {
  it('defaults an explicitly empty instrumentation object to elastic-inference', () => {
    const result = requestSchema.parse({
      subject: {
        traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
        instrumentation: {},
      },
      evaluators: [{ name: 'correctness' }],
    });

    expect(result.subject.instrumentation?.profile).toBe('elastic-inference');
  });
});
