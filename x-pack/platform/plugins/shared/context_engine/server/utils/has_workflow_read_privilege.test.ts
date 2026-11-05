/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { hasWorkflowReadPrivilege } from './has_workflow_read_privilege';

const securityWith = (hasAllRequested: boolean) => {
  const atSpace = jest.fn().mockResolvedValue({ hasAllRequested });
  const security = {
    authz: {
      actions: { api: { get: (action: string) => `api:${action}` } },
      checkPrivilegesWithRequest: jest.fn(() => ({ atSpace })),
    },
  };
  return { security: security as unknown as SecurityPluginStart, atSpace };
};

describe('hasWorkflowReadPrivilege', () => {
  const request = httpServerMock.createKibanaRequest();

  it('checks every workflow read privilege in the given space', async () => {
    const { security, atSpace } = securityWith(true);

    const allowed = await hasWorkflowReadPrivilege({ security, request, spaceId: 'marketing' });

    expect(allowed).toBe(true);
    expect(atSpace).toHaveBeenCalledWith('marketing', {
      kibana: WorkflowsManagementOperationPrivileges.read.map((action) => `api:${action}`),
    });
  });

  it('denies when the caller lacks a workflow read privilege', async () => {
    const { security } = securityWith(false);

    expect(await hasWorkflowReadPrivilege({ security, request, spaceId: 'default' })).toBe(false);
  });

  it('allows when the security plugin is disabled, as there is no privilege model to enforce', async () => {
    expect(
      await hasWorkflowReadPrivilege({ security: undefined, request, spaceId: 'default' })
    ).toBe(true);
  });
});
