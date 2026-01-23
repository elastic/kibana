/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';

/**
 * Context passed to middleware during step execution.
 */
export interface MiddlewareContext {
  readonly step: RuleExecutionStep;
  readonly state: Readonly<RulePipelineState>;
}

/**
 * Middleware interface for applying cross-cutting concerns to all steps.
 *
 * Middleware wraps step execution and can perform actions before/after the step runs.
 * Each middleware must call `next()` to continue the chain, or throw to abort.
 *
 * @example
 * ```typescript
 * @injectable()
 * export class LoggingMiddleware implements StepMiddleware {
 *   readonly name = 'logging';
 *
 *   async execute(ctx: MiddlewareContext, next: () => Promise<RuleStepOutput>) {
 *     console.log(`Starting step: ${ctx.step.name}`);
 *     const result = await next();
 *     console.log(`Finished step: ${ctx.step.name}`);
 *     return result;
 *   }
 * }
 * ```
 */
export interface StepMiddleware {
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
    context: MiddlewareContext,
    next: () => Promise<RuleStepOutput>
  ): Promise<RuleStepOutput>;
}

/**
 * DI token for the array of step middleware.
 * Middleware are executed in order (first middleware is outermost).
 */
export const StepMiddlewareToken = Symbol.for(
  'alerting_v2.StepMiddleware'
) as ServiceIdentifier<StepMiddleware[]>;
