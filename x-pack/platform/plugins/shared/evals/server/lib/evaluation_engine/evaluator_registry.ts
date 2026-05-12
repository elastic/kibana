/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export interface ServerEvaluator {
  name: string;
  kind: 'LLM' | 'CODE';
  description: string;
  source: 'prebuilt' | 'custom';
  evaluate: (params: ServerEvaluatorParams) => Promise<ServerEvaluatorResult>;
}

export interface ServerEvaluatorParams {
  input: Record<string, unknown>;
  output: unknown;
  expected?: unknown;
  metadata?: Record<string, unknown>;
  inferenceClient?: unknown;
  esClient?: unknown;
}

export interface ServerEvaluatorResult {
  evaluator: string;
  kind: 'LLM' | 'CODE';
  score: number | null;
  label?: string;
  explanation?: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export class EvaluatorRegistry {
  private evaluators = new Map<string, ServerEvaluator>();

  constructor(private readonly logger: Logger) {}

  register(evaluator: ServerEvaluator): void {
    if (this.evaluators.has(evaluator.name)) {
      this.logger.warn(`Evaluator "${evaluator.name}" already registered, overwriting`);
    }
    this.evaluators.set(evaluator.name, evaluator);
    this.logger.debug(
      `Registered evaluator: ${evaluator.name} (${evaluator.kind}, ${evaluator.source})`
    );
  }

  get(name: string): ServerEvaluator | undefined {
    return this.evaluators.get(name);
  }

  getAll(): ServerEvaluator[] {
    return Array.from(this.evaluators.values());
  }

  has(name: string): boolean {
    return this.evaluators.has(name);
  }

  remove(name: string): boolean {
    const existed = this.evaluators.delete(name);
    if (existed) {
      this.logger.debug(`Removed evaluator: ${name}`);
    }
    return existed;
  }

  getNames(): string[] {
    return Array.from(this.evaluators.keys());
  }
}
