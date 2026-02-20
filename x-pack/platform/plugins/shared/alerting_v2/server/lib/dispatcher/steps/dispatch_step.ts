/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server/workflows_management/workflows_management_api';
import type { DispatcherStep, DispatcherPipelineState, DispatcherStepOutput } from '../types';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { dispatchWorkflow } from '../workflow_dispatcher';

export class DispatchStep implements DispatcherStep {
  public readonly name = 'dispatch';

  constructor(
    private readonly workflowsManagement: WorkflowsManagementApi,
    private readonly logger: LoggerServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatch = [], policies = new Map() } = state;

    for (const group of dispatch) {
      const policy = policies.get(group.policyId);
      if (!policy?.apiKey) {
        this.logger.debug({
          message: () =>
            `Skipping dispatch for group ${group.id}: notification policy ${group.policyId} has no API key`,
        });
        continue;
      }
      const fakeRequest = craftFakeRequest(policy.apiKey);
      await dispatchWorkflow(group, fakeRequest, this.workflowsManagement);
    }

    return { type: 'continue' };
  }
}

function craftFakeRequest(apiKey: string): KibanaRequest {
  const fakeRawRequest: FakeRawRequest = {
    headers: { authorization: `ApiKey ${apiKey}` },
    path: '/',
  };
  return kibanaRequestFactory(fakeRawRequest);
}
