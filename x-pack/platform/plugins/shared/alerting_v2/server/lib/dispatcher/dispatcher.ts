/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server/workflows_management/workflows_management_api';
import { type LoggerServiceContract } from '../services/logger_service/logger_service';
import type { NotificationPolicySavedObjectServiceContract } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import type { QueryServiceContract } from '../services/query_service/query_service';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { DispatcherPipeline } from './execution_pipeline';
import {
  ApplySuppressionStep,
  ApplyThrottlingStep,
  BuildGroupsStep,
  DispatchStep,
  EvaluateMatchersStep,
  FetchEpisodesStep,
  FetchPoliciesStep,
  FetchRulesStep,
  FetchSuppressionsStep,
  RecordActionsStep,
} from './steps';
import type { DispatcherExecutionParams, DispatcherExecutionResult } from './types';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

export class DispatcherService implements DispatcherServiceContract {
  private readonly pipeline: DispatcherPipeline;

  constructor(
    queryService: QueryServiceContract,
    logger: LoggerServiceContract,
    storageService: StorageServiceContract,
    workflowsManagement: WorkflowsManagementApi,
    rulesSavedObjectService: RulesSavedObjectServiceContract,
    notificationPolicySavedObjectService: NotificationPolicySavedObjectServiceContract
  ) {
    this.pipeline = new DispatcherPipeline(logger, [
      new FetchEpisodesStep(queryService),
      new FetchSuppressionsStep(queryService),
      new ApplySuppressionStep(),
      new FetchRulesStep(rulesSavedObjectService),
      new FetchPoliciesStep(notificationPolicySavedObjectService),
      new EvaluateMatchersStep(),
      new BuildGroupsStep(),
      new ApplyThrottlingStep(queryService, logger),
      new DispatchStep(workflowsManagement, logger),
      new RecordActionsStep(storageService),
    ]);
  }

  public async run({
    previousStartedAt = new Date(),
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    await this.pipeline.execute({ startedAt, previousStartedAt });

    return { startedAt };
  }
}
