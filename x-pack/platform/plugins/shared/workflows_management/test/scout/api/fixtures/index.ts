/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, KbnClient, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { spaceTest as spaceBaseTest } from '@kbn/scout';
import type { ScoutSpaceParallelFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker';
import { WorkflowsApiService } from '../../common/apis/workflows';

export interface WorkflowsApiServicesFixture extends ApiServicesFixture {
  workflowsApi: WorkflowsApiService;
}

export interface WorkflowsWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: WorkflowsApiServicesFixture;
}

export const spaceTest = spaceBaseTest.extend<{}, WorkflowsWorkerFixtures>({
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        scoutSpace,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: KbnClient;
        scoutSpace: ScoutSpaceParallelFixture;
      },
      use: (extendedApiServices: WorkflowsApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as WorkflowsApiServicesFixture;
      extendedApiServices.workflowsApi = new WorkflowsApiService(scoutSpace.id, kbnClient);
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});
