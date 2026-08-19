/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { hasWorkflowReadPrivilege, hasWorkflowExecutePrivilege } from './check_privileges';

const request = {} as KibanaRequest;
const spaceId = 'default';

const createSecurityMock = (hasAllRequested: boolean) => {
  const atSpace = jest.fn().mockResolvedValue({ hasAllRequested });
  const checkPrivilegesWithRequest = jest.fn().mockReturnValue({ atSpace });
  const get = jest.fn((action: string) => `api:${action}`);

  const security = {
    authz: {
      actions: { api: { get } },
      checkPrivilegesWithRequest,
    },
  } as unknown as SecurityPluginStart;

  return { security, atSpace, get };
};

describe('workflow privilege checks', () => {
  describe('when the security plugin is disabled', () => {
    it('allows read', async () => {
      await expect(
        hasWorkflowReadPrivilege({ security: undefined, request, spaceId })
      ).resolves.toBe(true);
    });

    it('allows execute', async () => {
      await expect(
        hasWorkflowExecutePrivilege({ security: undefined, request, spaceId })
      ).resolves.toBe(true);
    });
  });

  describe('hasWorkflowReadPrivilege', () => {
    it('checks the read privilege and returns the verdict', async () => {
      const { security, atSpace, get } = createSecurityMock(true);

      await expect(hasWorkflowReadPrivilege({ security, request, spaceId })).resolves.toBe(true);

      expect(get).toHaveBeenCalledWith(WorkflowsManagementApiActions.read);
      expect(atSpace).toHaveBeenCalledWith(spaceId, {
        kibana: [`api:${WorkflowsManagementApiActions.read}`],
      });
    });

    it('returns false when not authorized', async () => {
      const { security } = createSecurityMock(false);
      await expect(hasWorkflowReadPrivilege({ security, request, spaceId })).resolves.toBe(false);
    });
  });

  describe('hasWorkflowExecutePrivilege', () => {
    it('requires both execute and read', async () => {
      const { security, atSpace } = createSecurityMock(true);

      await expect(hasWorkflowExecutePrivilege({ security, request, spaceId })).resolves.toBe(true);

      expect(atSpace).toHaveBeenCalledWith(spaceId, {
        kibana: [
          `api:${WorkflowsManagementApiActions.execute}`,
          `api:${WorkflowsManagementApiActions.read}`,
        ],
      });
    });

    it('returns false when not authorized', async () => {
      const { security } = createSecurityMock(false);
      await expect(hasWorkflowExecutePrivilege({ security, request, spaceId })).resolves.toBe(
        false
      );
    });
  });
});
