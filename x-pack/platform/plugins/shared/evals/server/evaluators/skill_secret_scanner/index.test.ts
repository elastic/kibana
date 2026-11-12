/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the Elastic License 2.0, the GNU Affero General Public License
 * v3.0 only, or the Server Side Public License v 1".
 */

import { skillSecretScannerEvaluator } from '.';
import type { EvidenceRound } from '../evidence/types';
import type { EvaluatorContext } from '../types';

const traceId = 'trace-1';
const log = { warn: jest.fn(), debug: jest.fn() } as unknown as EvaluatorContext['log'];
const trace = { traceId, esClient: {} as EvaluatorContext['trace']['esClient'] };

const round = (message: string): EvidenceRound => ({
  input: { message: 'query' },
  steps: [],
  response: { message },
});

describe('skill-secret-scanner', () => {
  it('passes clean output', async () => {
    await expect(
      skillSecretScannerEvaluator.evaluate({ trace, round: round('All clear'), log })
    ).resolves.toEqual({
      scores: [
        {
          name: 'skill-secret-scanner',
          score: 1,
          label: 'pass',
          explanation: 'No hard-coded secrets detected',
        },
      ],
    });
  });

  it('fails on an AWS access key', async () => {
    const result = await skillSecretScannerEvaluator.evaluate({
      trace,
      round: round('Set key AKIAIOSFODNN7EXAMPLE to rotate'),
      log,
    });
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[0].label).toBe('fail');
    expect(result.scores[0].metadata?.findings).toEqual([
      { type: 'aws-access-key', match: 'AKIA…LE' },
    ]);
  });

  it('redacts the secret in findings', async () => {
    const result = await skillSecretScannerEvaluator.evaluate({
      trace,
      round: round('token ghp_0123456789abcdefghijklmnopqrstuvwxyz'),
      log,
    });
    expect(JSON.stringify(result)).not.toContain('0123456789abcdef');
  });

  it('allows placeholders', async () => {
    await expect(
      skillSecretScannerEvaluator.evaluate({
        trace,
        round: round('Set API_KEY=<your-api-key> in the connector'),
        log,
      })
    ).resolves.toMatchObject({
      scores: [{ score: 1, label: 'pass' }],
    });
  });
});
