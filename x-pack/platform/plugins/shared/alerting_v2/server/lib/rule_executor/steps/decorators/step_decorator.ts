/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../../types';

/**
 * Base class for step decorators.
 *
 * Decorators wrap individual steps to add behavior specific to that step.
 * Unlike middleware (which applies to ALL steps), decorators are applied
 * selectively to specific steps at DI binding time.
 *
 * Use decorators when you need per-step control without adding conditionals
 * to middleware.
 *
 * @example
 * ```typescript
 * export class AuditLoggingDecorator extends StepDecorator {
 *   constructor(
 *     step: RuleExecutionStep,
 *     private readonly auditService: AuditServiceContract
 *   ) {
 *     super(step);
 *   }
 *
 *   async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
 *     await this.auditService.log({ action: `step.${this.name}.start` });
 *     const result = await this.step.execute(state);
 *     await this.auditService.log({ action: `step.${this.name}.${result.type}` });
 *     return result;
 *   }
 * }
 *
 * // In DI bindings:
 * new AuditLoggingDecorator(container.get(ValidateRuleStep), auditService)
 * ```
 */
export abstract class StepDecorator implements RuleExecutionStep {
  constructor(protected readonly step: RuleExecutionStep) {}

  /**
   * Returns the name of the wrapped step.
   */
  public get name(): string {
    return this.step.name;
  }

  /**
   * Execute the decorated step.
   * Subclasses should call `this.step.execute(state)` to invoke the wrapped step.
   */
  public abstract execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput>;
}
