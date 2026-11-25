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
  FetchActiveGroupsStep,
  ExecuteRuleQueryStep,
  CreateAlertEventsStep,
  ClassifyAbsentGroupsStep,
  SuppressRedundantNoDataEventsStep,
} from '../lib/rule_executor/steps';
import {
  CancellationBoundaryMiddleware,
  ErrorHandlingMiddleware,
  ApmMiddleware,
  RuleExecutionTelemetryMiddleware,
} from '../lib/rule_executor/middleware';
import {
  RuleExecutionTelemetry,
  RuleExecutionTelemetryToken,
} from '../lib/rule_executor/otel/rule_execution_telemetry';
import { DirectorStep } from '../lib/rule_executor/steps/director_step';
import { StoreAlertEventsStep } from '../lib/rule_executor/steps/store_alert_events';
import { PublishAlertStatusChangesStep } from '../lib/rule_executor/steps/publish_alert_status_changes_step';
import {
  EmittedCountersRecorder,
  MetricCollectorFactory,
  MetricCollectorFactoryToken,
  MetricRecorderToken,
  MetricsMiddleware,
  PersistedRuleEventsRecorder,
} from '../lib/rule_executor/metrics';

export const bindRuleExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  /**
   * Middlewares
   */
  bind(CancellationBoundaryMiddleware).toSelf();
  bind(ApmMiddleware).toSelf();
  bind(ErrorHandlingMiddleware).toSelf();
  bind(RuleExecutionTelemetryMiddleware).toSelf();
  bind(MetricsMiddleware).toSelf();

  /**
   * Middleware list via multi-injection.
   * Binding order defines execution order — first binding is outermost, last
   * binding is innermost (wraps the raw step output). MetricsMiddleware MUST
   * be bound last so it observes true per-step emissions before any other
   * middleware transforms them.
   */
  bind(RuleExecutionMiddlewaresToken).to(CancellationBoundaryMiddleware);
  bind(RuleExecutionMiddlewaresToken).to(ApmMiddleware);
  bind(RuleExecutionMiddlewaresToken).to(ErrorHandlingMiddleware);
  bind(RuleExecutionMiddlewaresToken).to(RuleExecutionTelemetryMiddleware);
  bind(RuleExecutionMiddlewaresToken).to(MetricsMiddleware);

  /**
   * OTel telemetry (one meter per process)
   */
  bind(RuleExecutionTelemetry).toSelf();
  bind(RuleExecutionTelemetryToken).toService(RuleExecutionTelemetry);

  /**
   * Metrics collection primitives.
   */
  bind(MetricCollectorFactoryToken).toConstantValue(new MetricCollectorFactory());
  bind(MetricRecorderToken).to(EmittedCountersRecorder);
  bind(MetricRecorderToken).to(PersistedRuleEventsRecorder);

  /**
   * Rule execution steps via multi-injection.
   * Binding order defines execution order.
   */
  bind(RuleExecutionStepsToken).to(WaitForResourcesStep);
  bind(RuleExecutionStepsToken).to(FetchRuleStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(ValidateRuleStep);
  bind(RuleExecutionStepsToken).to(FetchActiveGroupsStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(ExecuteRuleQueryStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(CreateAlertEventsStep);
  bind(RuleExecutionStepsToken).to(ClassifyAbsentGroupsStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(DirectorStep);
  bind(RuleExecutionStepsToken).to(SuppressRedundantNoDataEventsStep);
  bind(RuleExecutionStepsToken).to(StoreAlertEventsStep);
  bind(RuleExecutionStepsToken).to(PublishAlertStatusChangesStep).inRequestScope();

  bind(RuleExecutionPipeline).toSelf().inRequestScope();
};
