/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConvergenceLoop } from './convergence_loop';

describe('ConvergenceLoop', () => {
  const mockImprove = jest.fn();
  const mockValidate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stops on first pass if score >= threshold', async () => {
    mockValidate.mockResolvedValueOnce({ score: 0.9, passed: true });

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 5,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.finalScore).toBe(0.9);
    expect(result.iterations).toHaveLength(1);
    expect(result.converged).toBe(true);
    expect(result.reason).toBe('passed');
    expect(mockImprove).not.toHaveBeenCalled();
  });

  it('iterates improve then validate until passing', async () => {
    mockValidate
      .mockResolvedValueOnce({ score: 0.6, passed: false })
      .mockResolvedValueOnce({ score: 0.78, passed: false })
      .mockResolvedValueOnce({ score: 0.92, passed: true });
    mockImprove.mockResolvedValue(undefined);

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 5,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.finalScore).toBe(0.92);
    expect(result.iterations).toHaveLength(3);
    expect(result.converged).toBe(true);
    expect(mockImprove).toHaveBeenCalledTimes(2);
  });

  it('stops at max iterations', async () => {
    // Scores must vary enough to avoid plateau detection (delta >= 0.02)
    mockValidate
      .mockResolvedValueOnce({ score: 0.5, passed: false })
      .mockResolvedValueOnce({ score: 0.55, passed: false })
      .mockResolvedValueOnce({ score: 0.6, passed: false });
    mockImprove.mockResolvedValue(undefined);

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 3,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.iterations).toHaveLength(3);
    expect(result.converged).toBe(false);
    expect(result.reason).toBe('max_iterations');
  });

  it('stops on plateau (2 consecutive low-delta comparisons)', async () => {
    mockValidate
      .mockResolvedValueOnce({ score: 0.7, passed: false })
      .mockResolvedValueOnce({ score: 0.71, passed: false })
      .mockResolvedValueOnce({ score: 0.71, passed: false });
    mockImprove.mockResolvedValue(undefined);

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 5,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.converged).toBe(false);
    expect(result.reason).toBe('plateau');
    expect(result.iterations.length).toBeLessThanOrEqual(3);
  });

  it('returns reason "error" when validate throws', async () => {
    mockValidate
      .mockResolvedValueOnce({ score: 0.6, passed: false })
      .mockRejectedValueOnce(new Error('LLM connector timeout'));
    mockImprove.mockResolvedValue(undefined);

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 5,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.converged).toBe(false);
    expect(result.reason).toBe('error');
    expect(result.iterations).toHaveLength(1);
  });

  it('returns reason "error" when improve throws', async () => {
    mockValidate.mockResolvedValueOnce({ score: 0.6, passed: false });
    mockImprove.mockRejectedValueOnce(new Error('Improve failed'));

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 5,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.converged).toBe(false);
    expect(result.reason).toBe('error');
    expect(result.finalScore).toBe(0.6);
    expect(result.iterations).toHaveLength(1);
  });

  it('resets plateau counter when score improves meaningfully', async () => {
    mockValidate
      .mockResolvedValueOnce({ score: 0.6, passed: false })
      .mockResolvedValueOnce({ score: 0.61, passed: false }) // plateau +1
      .mockResolvedValueOnce({ score: 0.75, passed: false }) // big jump, reset
      .mockResolvedValueOnce({ score: 0.76, passed: false }) // plateau +1
      .mockResolvedValueOnce({ score: 0.77, passed: false }); // plateau +2 -> stop
    mockImprove.mockResolvedValue(undefined);

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 10,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.converged).toBe(false);
    expect(result.reason).toBe('plateau');
    expect(result.iterations).toHaveLength(5);
  });

  it('includes totalDurationMs in result', async () => {
    mockValidate.mockResolvedValueOnce({ score: 0.95, passed: true });

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 5,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('records correct iteration metadata', async () => {
    mockValidate
      .mockResolvedValueOnce({ score: 0.5, passed: false })
      .mockResolvedValueOnce({ score: 0.9, passed: true });
    mockImprove.mockResolvedValue(undefined);

    const loop = new ConvergenceLoop({
      threshold: 0.85,
      maxIterations: 5,
      convergenceDelta: 0.02,
      improve: mockImprove,
      validate: mockValidate,
    });

    const result = await loop.run();

    expect(result.iterations[0].iteration).toBe(1);
    expect(result.iterations[0].improved).toBe(false);
    expect(result.iterations[0].timestamp).toBeDefined();

    expect(result.iterations[1].iteration).toBe(2);
    expect(result.iterations[1].improved).toBe(true);
    expect(result.iterations[1].timestamp).toBeDefined();
  });
});
