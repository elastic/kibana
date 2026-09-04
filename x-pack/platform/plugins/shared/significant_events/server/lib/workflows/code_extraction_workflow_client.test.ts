/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import { CodeExtractionScopeConflictError } from './code_extraction_scope_conflict_error';
import { SignificantEventsCodeExtractionClient } from './code_extraction_workflow_client';

const createClient = ({ activeRepository }: { activeRepository?: string | null } = {}) => {
  const workflow = { id: 'code-extraction', definition: { steps: [] } };
  const activeExecution =
    activeRepository !== undefined
      ? {
          id: 'active-execution',
          status: ExecutionStatus.RUNNING,
          context: { inputs: { repository: activeRepository ?? '' } },
        }
      : undefined;
  const managementApi = {
    getWorkflowExecutions: jest
      .fn()
      .mockResolvedValue({ results: activeExecution ? [activeExecution] : [] }),
    getWorkflowExecution: jest.fn().mockResolvedValue(activeExecution),
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    runWorkflow: jest.fn().mockResolvedValue('execution-1'),
  };
  const client = new SignificantEventsCodeExtractionClient({
    managementApi: managementApi as never,
  });
  return { client, managementApi, workflow };
};

describe('SignificantEventsCodeExtractionClient', () => {
  it('passes an exact repository scope to the workflow', async () => {
    const { client, managementApi, workflow } = createClient();
    const request = {} as KibanaRequest;

    await expect(
      client.run({
        request,
        spaceId: 'default',
        inputs: { agentConnectorId: 'connector-id', repository: 'elastic/eis-gateway' },
      })
    ).resolves.toEqual({ executionId: 'execution-1', isNew: true });

    expect(managementApi.runWorkflow).toHaveBeenCalledWith(
      workflow,
      'default',
      { agentConnectorId: 'connector-id', repository: 'elastic/eis-gateway' },
      request
    );
  });

  it('omits repository input for an all-repository run', async () => {
    const { client, managementApi, workflow } = createClient();
    const request = {} as KibanaRequest;

    await client.run({
      request,
      spaceId: 'default',
      inputs: { agentConnectorId: 'connector-id' },
    });

    expect(managementApi.runWorkflow).toHaveBeenCalledWith(
      workflow,
      'default',
      { agentConnectorId: 'connector-id' },
      request
    );
  });

  it('reuses an active execution with the same repository scope', async () => {
    const { client, managementApi } = createClient({ activeRepository: 'elastic/eis-gateway' });

    await expect(
      client.run({
        request: {} as KibanaRequest,
        spaceId: 'default',
        inputs: { repository: 'elastic/eis-gateway' },
      })
    ).resolves.toEqual({ executionId: 'active-execution', isNew: false });
    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a request whose repository scope differs from the active execution', async () => {
    const { client, managementApi } = createClient({ activeRepository: null });

    await expect(
      client.run({
        request: {} as KibanaRequest,
        spaceId: 'default',
        inputs: { repository: 'elastic/eis-gateway' },
      })
    ).rejects.toThrow(CodeExtractionScopeConflictError);
    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });
});
