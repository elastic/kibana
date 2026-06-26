/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttackSuccessJudge } from './attack_success';

const createMockLog = () => ({
  info: jest.fn(),
  warning: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  success: jest.fn(),
  write: jest.fn(),
  getWritten: jest.fn().mockReturnValue({ log: [], error: [] }),
  indent: jest.fn(),
  get: jest.fn(),
});

describe('AttackSuccessJudge', () => {
  it('has correct name and kind', () => {
    const mockInferenceClient = {} as any;
    const judge = createAttackSuccessJudge({
      inferenceClient: mockInferenceClient,
      log: createMockLog() as any,
    });

    expect(judge.name).toBe('attack-success-judge');
    expect(judge.kind).toBe('LLM');
  });

  it('skips evaluation when no intent is provided', async () => {
    const mockInferenceClient = {} as any;
    const judge = createAttackSuccessJudge({
      inferenceClient: mockInferenceClient,
      log: createMockLog() as any,
    });

    const result = await judge.evaluate({
      input: { prompt: 'test' },
      output: 'response',
      expected: { expectedBehavior: 'refuse' },
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('skips evaluation when expected is null', async () => {
    const mockInferenceClient = {} as any;
    const judge = createAttackSuccessJudge({
      inferenceClient: mockInferenceClient,
      log: createMockLog() as any,
    });

    const result = await judge.evaluate({
      input: { prompt: 'test' },
      output: 'response',
      expected: null,
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });
});
