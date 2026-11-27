/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

// Stable for this run, including the delete and recreate. A new run gets a new id.
const WORKFLOW_ID = `scout-history-isolation-${randomUUID()}`;

const workflowYaml = (message: string) => `
name: History isolation
enabled: true
description: Manual workflow used to check execution history across a recreate
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "${message}"
`;

spaceTest.describe(
  'Workflow execution history follows the document',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.afterAll(async ({ apiServices }) => {
      try {
        await apiServices.workflowsApi.hardDelete(WORKFLOW_ID);
      } catch {
        // The workflow was already removed, or the test failed before creating it.
      }
    });

    spaceTest(
      'returns every run of the current document and none after the same id is recreated',
      async ({ apiServices }) => {
        const { workflowsApi } = apiServices;

        const created = await workflowsApi.create(workflowYaml('before'), WORKFLOW_ID);
        expect(created.id).toBe(WORKFLOW_ID);

        const executionIds: string[] = [];
        for (let run = 0; run < 2; run++) {
          const { workflowExecutionId } = await workflowsApi.run(WORKFLOW_ID, {});
          await workflowsApi.waitForTermination({ workflowExecutionId });
          executionIds.push(workflowExecutionId);
        }

        const updated = await workflowsApi.update(WORKFLOW_ID, { yaml: workflowYaml('after') });
        expect(updated.id).toBe(WORKFLOW_ID);

        for (let run = 0; run < 3; run++) {
          const { workflowExecutionId } = await workflowsApi.run(WORKFLOW_ID, {});
          await workflowsApi.waitForTermination({ workflowExecutionId });
          executionIds.push(workflowExecutionId);
        }

        const history = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(WORKFLOW_ID),
          condition: ({ results }) =>
            executionIds.every((id) => results.some((execution) => execution.id === id)),
          errorMessage: ({ total, results }) =>
            `Expected ${executionIds.length} executions, got ${total}: ${results
              .map((execution) => execution.id)
              .join(', ')}`,
        });
        expect(history.total).toBe(executionIds.length);
        expect(history.results.map((execution) => execution.id).sort()).toStrictEqual(
          [...executionIds].sort()
        );

        await workflowsApi.hardDelete(WORKFLOW_ID);

        const recreated = await workflowsApi.create(workflowYaml('recreated'), WORKFLOW_ID);
        expect(recreated.id).toBe(WORKFLOW_ID);

        const isolated = await workflowsApi.getExecutions(WORKFLOW_ID);
        expect(isolated.total).toBe(0);
        expect(isolated.results).toStrictEqual([]);
      }
    );
  }
);
