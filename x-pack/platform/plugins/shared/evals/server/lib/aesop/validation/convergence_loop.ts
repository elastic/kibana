/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConvergenceConfig {
  threshold: number;
  maxIterations: number;
  convergenceDelta: number;
  improve: () => Promise<void>;
  validate: () => Promise<{ score: number; passed: boolean }>;
  onError?: (error: unknown, iteration: number) => void;
}

export interface ConvergenceIteration {
  iteration: number;
  score: number;
  improved: boolean;
  timestamp: string;
}

export interface ConvergenceResult {
  finalScore: number;
  converged: boolean;
  reason: 'passed' | 'plateau' | 'max_iterations' | 'error';
  iterations: ConvergenceIteration[];
  totalDurationMs: number;
}

export class ConvergenceLoop {
  constructor(private readonly config: ConvergenceConfig) {}

  async run(): Promise<ConvergenceResult> {
    const startTime = Date.now();
    const iterations: ConvergenceIteration[] = [];
    let consecutivePlateau = 0;

    for (let i = 1; i <= this.config.maxIterations; i++) {
      try {
        const improved = i > 1;
        if (improved) {
          await this.config.improve();
        }

        const { score, passed } = await this.config.validate();

        iterations.push({
          iteration: i,
          score,
          improved,
          timestamp: new Date().toISOString(),
        });

        if (passed || score >= this.config.threshold) {
          return {
            finalScore: score,
            converged: true,
            reason: 'passed',
            iterations,
            totalDurationMs: Date.now() - startTime,
          };
        }

        if (i > 1) {
          const prevScore = iterations[i - 2].score;
          if (Math.abs(score - prevScore) < this.config.convergenceDelta) {
            consecutivePlateau++;
            if (consecutivePlateau >= 2) {
              return {
                finalScore: score,
                converged: false,
                reason: 'plateau',
                iterations,
                totalDurationMs: Date.now() - startTime,
              };
            }
          } else {
            consecutivePlateau = 0;
          }
        }
      } catch (error) {
        this.config.onError?.(error, i);
        return {
          finalScore: iterations[iterations.length - 1]?.score ?? 0,
          converged: false,
          reason: 'error',
          iterations,
          totalDurationMs: Date.now() - startTime,
        };
      }
    }

    return {
      finalScore: iterations[iterations.length - 1]?.score ?? 0,
      converged: false,
      reason: 'max_iterations',
      iterations,
      totalDurationMs: Date.now() - startTime,
    };
  }
}
