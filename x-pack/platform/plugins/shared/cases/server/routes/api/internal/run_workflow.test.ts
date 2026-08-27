/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WorkflowsManagementApiActions,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import { MAX_CASES_PER_WORKFLOW_RUN } from '../../../../common/constants';
import { createCasesClientMock } from '../../../client/mocks';
import type { CasesWorkflowRunService } from '../../../workflows/execution/service';
import {
  createRunWorkflowRoute,
  runCaseWorkflowBodySchema,
  runCaseWorkflowParamsSchema,
} from './run_workflow';

describe('run workflow route', () => {
  const casesClient = createCasesClientMock();
  const service = {
    run: jest.fn(),
  } as unknown as jest.Mocked<CasesWorkflowRunService>;
  const getSpaceId = jest.fn().mockReturnValue('space-1');
  const route = createRunWorkflowRoute({ service, getSpaceId });

  beforeEach(() => {
    jest.clearAllMocks();
    service.run.mockResolvedValue({
      workflowExecutionId: 'execution-1',
      activityStatus: 'succeeded',
    });
  });

  // The workflows plugin's route_privilege_consistency.test.ts only covers routes registered
  // within that plugin. This route is registered by Cases and escapes that guard, so we assert
  // the privilege explicitly here using the shared source of truth.
  it('requires the workflow execute privilege', () => {
    expect(route.security).toEqual({
      authz: {
        requiredPrivileges: [...WorkflowsManagementOperationPrivileges.execute],
      },
    });
    // Verify the concrete API action to catch any drift in WorkflowsManagementOperationPrivileges.
    const authz = route.security?.authz as { requiredPrivileges?: string[] } | undefined;
    expect(authz?.requiredPrivileges).toContain(WorkflowsManagementApiActions.execute);
  });

  it('delegates to the Cases workflow service and returns its result', async () => {
    const request = {
      params: {
        workflow_id: 'workflow-1',
      },
      body: {
        caseIds: ['case-1'],
        inputs: { event: { caseIds: ['case-1'] } },
        origin: { type: 'cases.case', caseId: 'case-1' },
      },
    };
    const response = { ok: jest.fn() };
    const context = {
      cases: {
        getCasesClient: jest.fn().mockResolvedValue(casesClient),
      },
    };

    await route.handler({
      context,
      request,
      response,
    } as unknown as Parameters<typeof route.handler>[0]);

    expect(service.run).toHaveBeenCalledWith({
      workflowId: 'workflow-1',
      body: request.body,
      request,
      context,
      casesClient,
      spaceId: 'space-1',
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        workflowExecutionId: 'execution-1',
        activityStatus: 'succeeded',
      },
    });
  });

  describe('body schema', () => {
    const validBody = {
      caseIds: ['case-1'],
      inputs: {},
      origin: { type: 'cases.case', caseId: 'case-1' },
    };

    it('accepts a valid single-case body', () => {
      expect(() => runCaseWorkflowBodySchema.validate(validBody)).not.toThrow();
    });

    it('accepts a body with no origin (list-surface / bulk run)', () => {
      const { origin: _omitted, ...bodyWithoutOrigin } = validBody;
      expect(() => runCaseWorkflowBodySchema.validate(bodyWithoutOrigin)).not.toThrow();
    });

    it('accepts a body with no origin and multiple caseIds', () => {
      const { origin: _omitted, ...bodyWithoutOrigin } = validBody;
      expect(() =>
        runCaseWorkflowBodySchema.validate({
          ...bodyWithoutOrigin,
          caseIds: ['case-1', 'case-2', 'case-3'],
        })
      ).not.toThrow();
    });

    it('accepts a cases.observable origin', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({
          ...validBody,
          origin: { type: 'cases.observable', caseId: 'case-1', observableId: 'obs-1' },
        })
      ).not.toThrow();
    });

    it('accepts a cases.alert origin', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({
          ...validBody,
          origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-1' },
        })
      ).not.toThrow();
    });

    it('accepts a cases.alerts origin', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({
          ...validBody,
          origin: { type: 'cases.alerts', caseId: 'case-1' },
        })
      ).not.toThrow();
    });

    it('rejects unknown keys on cases.case (strict per-variant)', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({
          ...validBody,
          origin: { type: 'cases.case', caseId: 'case-1', extraField: 'x' },
        })
      ).toThrow();
    });

    it(`accepts exactly ${MAX_CASES_PER_WORKFLOW_RUN} case ids (the cap)`, () => {
      const ids = Array.from({ length: MAX_CASES_PER_WORKFLOW_RUN }, (_, i) => `case-${i}`);
      expect(() =>
        runCaseWorkflowBodySchema.validate({ ...validBody, caseIds: ids })
      ).not.toThrow();
    });

    it('rejects an empty caseIds array', () => {
      expect(() => runCaseWorkflowBodySchema.validate({ ...validBody, caseIds: [] })).toThrow();
    });

    it(`rejects more than ${MAX_CASES_PER_WORKFLOW_RUN} case ids`, () => {
      const ids = Array.from({ length: MAX_CASES_PER_WORKFLOW_RUN + 1 }, (_, i) => `case-${i}`);
      expect(() => runCaseWorkflowBodySchema.validate({ ...validBody, caseIds: ids })).toThrow();
    });

    it('rejects duplicate case ids', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({ ...validBody, caseIds: ['case-1', 'case-1'] })
      ).toThrow('caseIds must not contain duplicates.');
    });

    it('rejects a case id that exceeds the maximum length', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({ ...validBody, caseIds: ['a'.repeat(1025)] })
      ).toThrow();
    });

    it('rejects oversized workflow inputs', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({
          ...validBody,
          inputs: { value: 'a'.repeat(1_000_001) },
        })
      ).toThrow('Workflow inputs cannot exceed 1000000 bytes.');
    });

    it('rejects unknown origin types', () => {
      expect(() =>
        runCaseWorkflowBodySchema.validate({
          ...validBody,
          origin: { type: 'cases.bogus', id: 'x' },
        })
      ).toThrow();
    });
  });

  describe('params schema', () => {
    it('accepts a valid workflow_id', () => {
      expect(() =>
        runCaseWorkflowParamsSchema.validate({ workflow_id: 'workflow-1' })
      ).not.toThrow();
    });

    it('rejects an oversized workflow_id', () => {
      expect(() =>
        runCaseWorkflowParamsSchema.validate({ workflow_id: 'a'.repeat(1025) })
      ).toThrow();
    });
  });
});
