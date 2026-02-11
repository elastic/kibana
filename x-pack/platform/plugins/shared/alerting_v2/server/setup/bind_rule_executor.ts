/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { RuleExecutionPipeline } from '../lib/rule_executor/execution_pipeline';
import {
  RuleExecutionStepsToken,
  RuleExecutionMiddlewaresToken,
} from '../lib/rule_executor/tokens';
import {
  WaitForResourcesStep,
  FetchRuleStep,
  ValidateRuleStep,
  ExecuteRuleQueryStep,
  CreateAlertEventsStep,
} from '../lib/rule_executor/steps';
import {
  CancellationBoundaryMiddleware,
  ErrorHandlingMiddleware,
} from '../lib/rule_executor/middleware';
import { DirectorStep } from '../lib/rule_executor/steps/director_step';
import { StoreAlertEventsStep } from '../lib/rule_executor/steps/store_alert_events';

export const bindRuleExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  /**
   * Middlewares
   */
  bind(CancellationBoundaryMiddleware).toSelf().inSingletonScope();
  bind(ErrorHandlingMiddleware).toSelf().inSingletonScope();

  /**
   * Middleware list
   */
  bind(RuleExecutionMiddlewaresToken)
    .toDynamicValue(({ get }) => [
      // First middleware is outermost wrapper
      get(CancellationBoundaryMiddleware),
      get(ErrorHandlingMiddleware),
    ])
    .inSingletonScope();

  /**
   * Rule executor steps
   */
  bind(WaitForResourcesStep).toSelf().inSingletonScope();
  bind(FetchRuleStep).toSelf().inRequestScope();
  bind(ValidateRuleStep).toSelf().inSingletonScope();
  bind(ExecuteRuleQueryStep).toSelf().inRequestScope();
  bind(CreateAlertEventsStep).toSelf().inSingletonScope();
  bind(DirectorStep).toSelf().inSingletonScope();
  bind(StoreAlertEventsStep).toSelf().inSingletonScope();

  /**
   * Bind steps array (order defines execution order)
   * Steps can be wrapped with decorators for per-step behavior
   * For example: new AuditLoggingDecorator(get(ValidateRuleStep), auditService)
   */

  bind(RuleExecutionStepsToken)
    .toDynamicValue(({ get }) => [
      get(WaitForResourcesStep),
      get(FetchRuleStep),
      get(ValidateRuleStep),
      get(ExecuteRuleQueryStep),
      get(CreateAlertEventsStep),
      get(DirectorStep),
      get(StoreAlertEventsStep),
    ])
    .inRequestScope();

  bind(RuleExecutionPipeline).toSelf().inRequestScope();
};
