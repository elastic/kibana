/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleExecutionPipelineContract } from '../execution_pipeline';

/**
 * Decorator pattern for the rule-execution pipeline.
 *
 * Each registered decorator wraps the inner contract once at container-bind
 * time. Wrappers can run logic before / after / around `execute(input)` and
 * may enrich the input that flows down to the inner pipeline. Decorators
 * stack via `decorators.reduce((acc, dec) => dec.wrap(acc), innerPipeline)`,
 * so the **first** registered decorator becomes the **outermost** wrapper.
 *
 * Closed for modification of the existing pipeline; open for extension by
 * adding a new decorator binding.
 */
export interface RuleExecutionPipelineDecorator {
  readonly name: string;
  wrap(inner: RuleExecutionPipelineContract): RuleExecutionPipelineContract;
}

/**
 * Multi-injection token for {@link RuleExecutionPipelineDecorator} bindings.
 *
 * Bind concrete decorators with:
 * `bind(RuleExecutionPipelineDecoratorToken).to(MyDecorator).inSingletonScope();`
 */
export const RuleExecutionPipelineDecoratorToken = Symbol.for(
  'alerting_v2.RuleExecutionPipelineDecorator'
) as ServiceIdentifier<RuleExecutionPipelineDecorator>;
