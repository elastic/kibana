/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleExecutionStep } from './types';
import type { RuleExecutionMiddleware } from './middleware';
import type { RuleExecutionPipelineContract } from './execution_pipeline';

/**
 * Token for multi-injecting the ordered execution steps.
 * Binding order defines execution order.
 */
export const RuleExecutionStepsToken = Symbol.for(
  'alerting_v2.RuleExecutionSteps'
) as ServiceIdentifier<RuleExecutionStep>;

/**
 * Token for multi-injecting the ordered execution middlewares.
 */
export const RuleExecutionMiddlewaresToken = Symbol.for(
  'alerting_v2.RuleExecutionMiddlewares'
) as ServiceIdentifier<RuleExecutionMiddleware>;

/**
 * Token for the (decorated) {@link RuleExecutionPipelineContract}.
 *
 * Always bound via a `toDynamicValue` factory in `bind_rule_executor.ts`
 * that resolves the inner {@link RuleExecutionPipeline} and folds every
 * registered {@link RuleExecutionPipelineDecorator} around it. Consumers
 * (e.g. `RuleExecutorTaskRunner`) inject this token rather than the
 * concrete class so they always see the fully decorated chain.
 */
export const RuleExecutionPipelineContractToken = Symbol.for(
  'alerting_v2.RuleExecutionPipelineContract'
) as ServiceIdentifier<RuleExecutionPipelineContract>;
