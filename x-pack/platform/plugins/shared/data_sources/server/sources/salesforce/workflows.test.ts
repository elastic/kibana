/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import {
  getWorkflowYaml,
  loadWorkflowsFromConnectorSpec,
  type ProcessedWorkflow,
} from '../workflow.test_helpers';

const CONNECTOR_NAME = 'fake-salesforce-connector';
const CONNECTOR_ID = 'fake-salesforce-connector-uuid';

describe('salesforce workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.salesforce', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.salesforce' },
    ]);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
      params,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      const subAction = params.subAction as string;

      switch (subAction) {
        case 'search':
          return {
            status: 'ok',
            actionId,
            data: { searchRecords: [{ Id: '001', Name: 'Acme' }] },
          };
        case 'query':
          return {
            status: 'ok',
            actionId,
            data: { records: [{ Id: '001', Name: 'Acme' }], totalSize: 1, done: true },
          };
        case 'list_records':
          return {
            status: 'ok',
            actionId,
            data: { records: [{ Id: '001' }], totalSize: 1, done: true },
          };
        case 'get_record':
          return {
            status: 'ok',
            actionId,
            data: { Id: '001', Name: 'Acme Corp', Type: 'Customer' },
          };
        case 'download_file':
          return {
            status: 'ok',
            actionId,
            data: { base64: 'dGVzdA==', contentType: 'application/pdf' },
          };
        case 'describe':
          return {
            status: 'ok',
            actionId,
            data: { name: 'Account', fields: [{ name: 'Id', type: 'id' }] },
          };
        default:
          throw new Error(`Unexpected Salesforce subAction: ${subAction}`);
      }
    };
  });

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('all workflows pass production validation without liquid template errors', () => {
    for (const wf of workflows) {
      expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
        workflow: wf.name,
        liquidErrors: [],
      });
    }
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { search_term: 'Acme Corp', returning: 'Account,Contact' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'search',
            subActionParams: {
              searchTerm: 'Acme Corp',
              returning: 'Account,Contact',
              nextRecordsUrl: undefined,
            },
          }),
        })
      );
    });
  });

  describe('query workflow', () => {
    it('forwards SOQL query to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'query'),
        inputs: { soql: 'SELECT Id, Name FROM Account LIMIT 10' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'query',
            subActionParams: {
              soql: 'SELECT Id, Name FROM Account LIMIT 10',
              nextRecordsUrl: undefined,
            },
          }),
        })
      );
    });
  });

  describe('list_records workflow', () => {
    it('forwards list parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_records'),
        inputs: { sobject_name: 'Account', limit: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'list_records',
            subActionParams: {
              sobjectName: 'Account',
              limit: 5,
              nextRecordsUrl: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_record workflow', () => {
    it('forwards record lookup to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_record'),
        inputs: { sobject_name: 'Account', record_id: '001ABC123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'get_record',
            subActionParams: {
              sobjectName: 'Account',
              recordId: '001ABC123',
            },
          }),
        })
      );
    });
  });

  describe('download_file workflow', () => {
    it('forwards content version ID to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download_file'),
        inputs: { content_version_id: '068ABC123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'download_file',
            subActionParams: {
              contentVersionId: '068ABC123',
            },
          }),
        })
      );
    });
  });

  describe('describe workflow', () => {
    it('forwards sobject name to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'describe'),
        inputs: { sobject_name: 'Account' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'describe',
            subActionParams: {
              sobjectName: 'Account',
            },
          }),
        })
      );
    });
  });
});
