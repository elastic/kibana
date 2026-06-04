/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { DispatcherPipeline, parallelGroup } from '../lib/dispatcher/execution_pipeline';
import { DispatcherExecutionStepsToken } from '../lib/dispatcher/steps/tokens';
import {
  FetchEpisodesStep,
  FetchSuppressionsStep,
  ApplySuppressionStep,
  FetchRulesStep,
  ApplyMaintenanceWindowStep,
  FetchPoliciesStep,
  EvaluateMatchersStep,
  BuildGroupsStep,
  ApplyThrottlingStep,
  DispatchStep,
  StoreActionsStep,
  StoreExecutionHistoryStep,
} from '../lib/dispatcher/steps';

export const bindDispatcherExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  /**
   * Step classes participating in a parallel group are bound to themselves
   * so the dynamic group factory can resolve their inversify-managed
   * instances. Steps used only as serial entries do not need a self-binding.
   */
  bind(FetchEpisodesStep).toSelf().inSingletonScope();
  bind(FetchPoliciesStep).toSelf().inSingletonScope();

  /**
   * Dispatcher execution entries via multi-injection. Binding order is
   * execution order; each entry is either a single step (executed
   * serially) or a parallel group (children executed concurrently).
   *
   * `fetch_episodes` and `fetch_policies` are grouped because
   * `FetchPoliciesStep.execute` reads no fields from prior pipeline
   * state (verified) and `FetchEpisodesStep` only reads `input.eventWatermark`.
   * Pulling `fetch_policies` off the critical path removes its p95 cost
   * (~158 ms in the entity-store perf benchmark) from the serialized
   * tick budget. See `execution_pipeline.ts` for parallel-group semantics
   * and `execution_pipeline.equivalence.test.ts` for the proof that this
   * regrouping preserves observable dispatcher behavior.
   */
  bind(DispatcherExecutionStepsToken)
    .toDynamicValue(({ get }) => parallelGroup(get(FetchEpisodesStep), get(FetchPoliciesStep)))
    .inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(FetchSuppressionsStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(ApplySuppressionStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(FetchRulesStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(EvaluateMatchersStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(BuildGroupsStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(ApplyThrottlingStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(DispatchStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(StoreActionsStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(StoreExecutionHistoryStep).inSingletonScope();

  bind(DispatcherPipeline).toSelf().inSingletonScope();
};
