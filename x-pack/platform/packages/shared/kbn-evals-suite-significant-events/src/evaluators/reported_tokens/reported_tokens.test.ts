/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReportedTokenEvaluators, readReportedTokens } from '.';

const [reportedInputTokens, reportedOutputTokens] = createReportedTokenEvaluators();

const evaluateWith = (output: unknown) => ({
  input: {},
  output,
  expected: undefined,
  metadata: null,
});

describe('reported token evaluators', () => {
  it('reports the provider input and output token counts', async () => {
    const output = {
      tokens_used: { prompt: 41_200, completion: 3_150, total: 44_350, cached: 0 },
    };

    await expect(reportedInputTokens.evaluate(evaluateWith(output))).resolves.toMatchObject({
      score: 41_200,
    });
    await expect(reportedOutputTokens.evaluate(evaluateWith(output))).resolves.toMatchObject({
      score: 3_150,
    });
  });

  it('scores null when the task did not report token counts', async () => {
    const result = await reportedInputTokens.evaluate(evaluateWith({ features: [] }));

    expect(result.score).toBeNull();
    expect(result.explanation).toContain('did not report');
  });

  it.each([null, undefined, [], 'unexpected'])('tolerates %p task output', async (output) => {
    expect(readReportedTokens(output)).toBeUndefined();
    await expect(reportedInputTokens.evaluate(evaluateWith(output))).resolves.toMatchObject({
      score: null,
    });
  });
});
