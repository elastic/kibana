/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import {
  RuleExecutionPipeline,
  type RuleExecutionPipelineContract,
} from '../lib/rule_executor/execution_pipeline';
import {
  RuleExecutionMiddlewaresToken,
  RuleExecutionPipelineContractToken,
  RuleExecutionStepsToken,
} from '../lib/rule_executor/tokens';
import {
  WaitForResourcesStep,
  FetchRuleStep,
  ValidateRuleStep,
  ExecuteRuleQueryStep,
  CreateAlertEventsStep,
  CreateRecoveryEventsStep,
} from '../lib/rule_executor/steps';
import {
  CancellationBoundaryMiddleware,
  ErrorHandlingMiddleware,
  ApmMiddleware,
} from '../lib/rule_executor/middleware';
import { DirectorStep } from '../lib/rule_executor/steps/director_step';
import { StoreAlertEventsStep } from '../lib/rule_executor/steps/store_alert_events';
import {
  RuleExecutionPipelineDecoratorToken,
  TelemetryRecorderDecorator,
  type RuleExecutionPipelineDecorator,
} from '../lib/rule_executor/decorators';

export const bindRuleExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  /**
   * Middlewares
   */
  bind(CancellationBoundaryMiddleware).toSelf().inSingletonScope();
  bind(ApmMiddleware).toSelf().inSingletonScope();
  bind(ErrorHandlingMiddleware).toSelf().inSingletonScope();

  /**
   * Middleware list via multi-injection.
   * Binding order defines execution order.
   */
  bind(RuleExecutionMiddlewaresToken).to(CancellationBoundaryMiddleware).inSingletonScope();
  bind(RuleExecutionMiddlewaresToken).to(ApmMiddleware).inSingletonScope();
  bind(RuleExecutionMiddlewaresToken).to(ErrorHandlingMiddleware).inSingletonScope();

  /**
   * Rule execution steps via multi-injection.
   * Binding order defines execution order.
   */
  bind(RuleExecutionStepsToken).to(WaitForResourcesStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(FetchRuleStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(ValidateRuleStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(ExecuteRuleQueryStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(CreateAlertEventsStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(CreateRecoveryEventsStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(DirectorStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(StoreAlertEventsStep).inSingletonScope();

  /**
   * Inner pipeline. Bound to the concrete class so decorators can resolve it
   * directly.
   */
  bind(RuleExecutionPipeline).toSelf().inRequestScope();

  /**
   * Around-pipeline decorators via multi-injection.
   *
   * Each decorator wraps the inner contract once and may run logic before /
   * after / around `execute(input)`. Add new decorators by appending another
   * `bind(RuleExecutionPipelineDecoratorToken).to(NewDecorator)` line.
   *
   * Order = the order they are bound here. The first registered decorator
   * becomes the **outermost** wrapper after the fold below.
   */
  bind(TelemetryRecorderDecorator).toSelf().inSingletonScope();
  bind(RuleExecutionPipelineDecoratorToken).to(TelemetryRecorderDecorator).inSingletonScope();

  /**
   * Decorated contract.
   *
   * Folds the registered decorators around the inner pipeline:
   *   reduce((acc, dec) => dec.wrap(acc), inner)
   *
   * Consumers (`RuleExecutorTaskRunner`) inject the contract token rather
   * than the concrete class so they always pick up the decorator chain.
   */
  bind(RuleExecutionPipelineContractToken)
    .toDynamicValue(({ get, getAll }) => {
      const inner: RuleExecutionPipelineContract = get(RuleExecutionPipeline);
      const decorators = getAll<RuleExecutionPipelineDecorator>(
        RuleExecutionPipelineDecoratorToken
      );
      return decorators.reduce<RuleExecutionPipelineContract>((acc, dec) => dec.wrap(acc), inner);
    })
    .inRequestScope();
};
