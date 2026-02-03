/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';

/**
 * Context passed to middleware during step execution.
 */
export interface RuleExecutionMiddlewareContext {
  readonly step: RuleExecutionStep;
  readonly state: Readonly<RulePipelineState>;
}

/**
 * Middleware interface for applying logic to all steps.
 *
 * Middleware wraps step execution and can perform actions before/after the step runs.
 * Each middleware must call `next()` to continue the chain, or throw to abort.
 */
export interface RuleExecutionMiddleware {
  /**
   * Unique name for the middleware (used for debugging/logging).
   */
  readonly name: string;

  /**
   * Execute the middleware logic.
   *
   * @param context - The middleware context containing step and state
   * @param next - Function to call the next middleware or step
   * @returns The step output (must return what `next()` returns or a modified version)
   */
  execute(
    context: RuleExecutionMiddlewareContext,
    next: () => Promise<RuleStepOutput>
  ): Promise<RuleStepOutput>;
}
