/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { ALERTING_V2_API_PRIVILEGES } from '../../../common/feature_privileges';
import { hasRulesWritePrivilege, hasActionPoliciesWritePrivilege } from './check_privileges';

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

describe('alerting privilege checks', () => {
  describe('when the security plugin is disabled', () => {
    it('allows rules write', async () => {
      await expect(
        hasRulesWritePrivilege({ security: undefined, request, spaceId })
      ).resolves.toBe(true);
    });

    it('allows action policies write', async () => {
      await expect(
        hasActionPoliciesWritePrivilege({ security: undefined, request, spaceId })
      ).resolves.toBe(true);
    });
  });

  describe('hasRulesWritePrivilege', () => {
    it('checks the write privilege and returns the verdict', async () => {
      const { security, atSpace, get } = createSecurityMock(true);

      await expect(hasRulesWritePrivilege({ security, request, spaceId })).resolves.toBe(true);

      expect(get).toHaveBeenCalledWith(ALERTING_V2_API_PRIVILEGES.rules.write);
      expect(atSpace).toHaveBeenCalledWith(spaceId, {
        kibana: [`api:${ALERTING_V2_API_PRIVILEGES.rules.write}`],
      });
    });

    it('returns false when not authorized', async () => {
      const { security } = createSecurityMock(false);
      await expect(hasRulesWritePrivilege({ security, request, spaceId })).resolves.toBe(false);
    });
  });

  describe('hasActionPoliciesWritePrivilege', () => {
    it('checks the write privilege and returns the verdict', async () => {
      const { security, atSpace, get } = createSecurityMock(true);

      await expect(
        hasActionPoliciesWritePrivilege({ security, request, spaceId })
      ).resolves.toBe(true);

      expect(get).toHaveBeenCalledWith(ALERTING_V2_API_PRIVILEGES.actionPolicies.write);
      expect(atSpace).toHaveBeenCalledWith(spaceId, {
        kibana: [`api:${ALERTING_V2_API_PRIVILEGES.actionPolicies.write}`],
      });
    });

    it('returns false when not authorized', async () => {
      const { security } = createSecurityMock(false);
      await expect(
        hasActionPoliciesWritePrivilege({ security, request, spaceId })
      ).resolves.toBe(false);
    });
  });
});
