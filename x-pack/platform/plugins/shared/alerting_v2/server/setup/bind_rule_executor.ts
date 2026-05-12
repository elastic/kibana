/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { RuleExecutionPipeline } from '../lib/rule_executor/execution_pipeline';
import {
  RuleExecutionMiddlewaresToken,
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
  LifecycleEmitterMiddleware,
} from '../lib/rule_executor/middleware';
import { DirectorStep } from '../lib/rule_executor/steps/director_step';
import { StoreAlertEventsStep } from '../lib/rule_executor/steps/store_alert_events';
import { RuleExecutionObserverHub, RuleExecutionObserverToken } from '../lib/rule_executor/events';
import { TelemetryObserver } from '../lib/services/event_log_service/telemetry_observer';

export const bindRuleExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  /**
   * Middlewares
   */
  bind(CancellationBoundaryMiddleware).toSelf().inSingletonScope();
  bind(LifecycleEmitterMiddleware).toSelf().inSingletonScope();
  bind(ApmMiddleware).toSelf().inSingletonScope();
  bind(ErrorHandlingMiddleware).toSelf().inSingletonScope();

  /**
   * Middleware list via multi-injection.
   * Binding order defines execution order (first = outermost wrapper).
   *
   * Cancellation guards are outermost so they always fire at the boundary.
   * LifecycleEmitter sits just inside so per-step duration includes inner
   * middleware overhead (matches what an operator sees as "step duration").
   * ApmMiddleware and ErrorHandlingMiddleware are innermost so they wrap
   * the actual step work.
   */
  bind(RuleExecutionMiddlewaresToken).to(CancellationBoundaryMiddleware).inSingletonScope();
  bind(RuleExecutionMiddlewaresToken).to(LifecycleEmitterMiddleware).inSingletonScope();
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
   * Pipeline. Bound directly — no decorator chain. The task runner injects
   * `RuleExecutionPipeline` as-is and observes the run via the event hub.
   */
  bind(RuleExecutionPipeline).toSelf().inRequestScope();

  /**
   * Event-driven observability.
   *
   * The hub is a singleton broadcaster: it multi-injects every observer
   * bound to {@link RuleExecutionObserverToken} and fans every emitted
   * {@link RuleExecutionEvent} out to all of them. Errors from observers
   * are caught by the hub so a misbehaving probe cannot break the rule.
   *
   * To add a new observer (audit logging, performance profiling, debug
   * tracing, dynamic sampling, anything else), implement
   * {@link RuleExecutionObserver} and append a single bind line below.
   * No changes are required to the pipeline, the steps, or the task runner.
   */
  bind(RuleExecutionObserverHub).toSelf().inSingletonScope();

  bind(TelemetryObserver).toSelf().inSingletonScope();
  bind(RuleExecutionObserverToken).to(TelemetryObserver).inSingletonScope();
};
