/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { DispatcherPipeline } from '../lib/dispatcher/execution_pipeline';
import { DispatcherExecutionStepsToken } from '../lib/dispatcher/steps/tokens';
import {
  WaitForResourcesStep,
  FetchAlertsStep,
  FetchSuppressionsStep,
  ApplySuppressionStep,
  HydrateAlertDataStep,
  FetchRulesStep,
  ApplyMaintenanceWindowStep,
  FetchPoliciesStep,
  EvaluateMatchersStep,
  BuildGroupsStep,
  ApplyAlreadyNotifiedStep,
  ApplyThrottlingStep,
  DispatchStep,
} from '../lib/dispatcher/steps';

export const bindDispatcherExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  /**
   * Dispatcher execution steps via multi-injection.
   * Binding order defines execution order.
   */
  bind(DispatcherExecutionStepsToken).to(WaitForResourcesStep);
  bind(DispatcherExecutionStepsToken).to(FetchAlertsStep);
  bind(DispatcherExecutionStepsToken).to(FetchSuppressionsStep);
  bind(DispatcherExecutionStepsToken).to(ApplySuppressionStep);
  bind(DispatcherExecutionStepsToken).to(HydrateAlertDataStep);
  bind(DispatcherExecutionStepsToken).to(FetchRulesStep);
  bind(DispatcherExecutionStepsToken).to(ApplyMaintenanceWindowStep);
  bind(DispatcherExecutionStepsToken).to(FetchPoliciesStep);
  bind(DispatcherExecutionStepsToken).to(EvaluateMatchersStep);
  bind(DispatcherExecutionStepsToken).to(BuildGroupsStep);
  bind(DispatcherExecutionStepsToken).to(ApplyAlreadyNotifiedStep);
  bind(DispatcherExecutionStepsToken).to(ApplyThrottlingStep);
  bind(DispatcherExecutionStepsToken).to(DispatchStep);

  bind(DispatcherPipeline).toSelf();
};
