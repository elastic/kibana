/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import {
  CASE_TASK_REFRESH_WORKFLOW_URL,
  CASE_TASK_RUN_WORKFLOW_URL,
} from '../../../../common/constants';
import type { CasesClient } from '../../../client';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

const params = {
  params: schema.object({
    case_id: schema.string(),
    task_id: schema.string(),
  }),
};

/** The URL names the case; a task from another case answers like a missing one. */
const ensureTaskOfCase = async (casesClient: CasesClient, caseId: string, taskId: string) => {
  const task = await casesClient.tasks.get(taskId);
  if (task.case_id !== caseId) {
    throw Boom.notFound(`Task ${taskId} was not found in case ${caseId}`);
  }
};

export const runTaskWorkflowRoute = createCasesRoute({
  method: 'post',
  path: CASE_TASK_RUN_WORKFLOW_URL,
  // Like the case run-workflow route: the workflows execute and read privileges here, Cases
  // update on the case in the client.
  security: {
    authz: {
      requiredPrivileges: [
        ...WorkflowsManagementOperationPrivileges.execute,
        ...WorkflowsManagementOperationPrivileges.read,
      ],
    },
  },
  routerOptions: {
    access: 'internal',
    summary: "Run a case task's workflow",
  },
  params,
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      await ensureTaskOfCase(casesClient, request.params.case_id, request.params.task_id);
      const task = await casesClient.tasks.runWorkflow(request.params.task_id);
      return response.ok({ body: task });
    } catch (error) {
      throw createCaseError({
        message: `Failed to run a case task's workflow in route: ${error}`,
        error,
      });
    }
  },
});

export const refreshTaskWorkflowRoute = createCasesRoute({
  method: 'post',
  path: CASE_TASK_REFRESH_WORKFLOW_URL,
  security: {
    authz: {
      requiredPrivileges: [...WorkflowsManagementOperationPrivileges.read],
    },
  },
  routerOptions: {
    access: 'internal',
    summary: "Read the outcome of a case task's workflow run",
  },
  params,
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      await ensureTaskOfCase(casesClient, request.params.case_id, request.params.task_id);
      const task = await casesClient.tasks.refreshWorkflowRun(request.params.task_id);
      return response.ok({ body: task });
    } catch (error) {
      throw createCaseError({
        message: `Failed to read a case task's workflow run in route: ${error}`,
        error,
      });
    }
  },
});
