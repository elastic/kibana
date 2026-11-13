/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skillSecretScannerEvaluator } from '.';
import type { EvidenceRound } from '../evidence/types';
import type { EvaluatorContext } from '../types';

const traceId = 'trace-1';
const log = { warn: jest.fn(), debug: jest.fn() } as unknown as EvaluatorContext['log'];
const trace = { traceId, esClient: {} as NonNullable<EvaluatorContext['trace']>['esClient'] };

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

  it('allows a placeholder value that would otherwise match a secret pattern', async () => {
    const value = 'Zq8Xk2Lm9Pw4Rt6Yv1Bn3Cd5Fg7Hj0-changeme-Ks2Ld4Mf6';
    // Control: without the placeholder marker the same shape is flagged.
    const control = await skillSecretScannerEvaluator.evaluate({
      trace,
      round: round(`api_key="${value.replace('changeme', 'Qw9Er7Ty5')}"`),
      log,
    });
    expect(control.scores[0]).toMatchObject({ score: 0, label: 'fail' });

    await expect(
      skillSecretScannerEvaluator.evaluate({ trace, round: round(`api_key="${value}"`), log })
    ).resolves.toMatchObject({
      scores: [{ score: 1, label: 'pass' }],
    });
  });

  it('does not flag a low-entropy value just because the key prefix raises entropy', async () => {
    const value = 'abcdefgh'.repeat(5);
    const result = await skillSecretScannerEvaluator.evaluate({
      trace,
      round: round(`aws_secret_access_key = "${value}"`),
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });

  it('still flags a high-entropy value assigned to an api key', async () => {
    const result = await skillSecretScannerEvaluator.evaluate({
      trace,
      round: round('api_key = "Zq8Xk2Lm9Pw4Rt6Yv1Bn3Cd5Fg7Hj0Ks2Ld4Mf6Np8"'),
      log,
    });
    expect(result.scores[0].metadata?.grouped).toEqual({ 'elastic-api-key': 1 });
  });

  it('ignores secrets that only appear in tool results', async () => {
    const result = await skillSecretScannerEvaluator.evaluate({
      trace,
      round: {
        input: { message: 'query' },
        steps: [
          {
            tool_id: 'read_file',
            arguments: { path: '.env' },
            result: 'token ghp_0123456789abcdefghijklmnopqrstuvwxyz',
          },
        ],
        response: { message: 'Done' },
      },
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });

  it('flags a secret the agent wrote into tool-call arguments', async () => {
    const result = await skillSecretScannerEvaluator.evaluate({
      trace,
      round: {
        input: { message: 'query' },
        steps: [
          {
            tool_id: 'write_file',
            arguments: { content: 'token ghp_0123456789abcdefghijklmnopqrstuvwxyz' },
          },
        ],
        response: { message: 'Done' },
      },
      log,
    });
    expect(result.scores[0].metadata?.grouped).toEqual({ 'github-pat': 1 });
  });
});
