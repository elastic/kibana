/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { ALERTING_V2_API_PRIVILEGES } from '../../../../common/feature_privileges';
import { PrivilegeChecker } from './privilege_checker';

const request = {} as KibanaRequest;
const spaceId = 'default';

const createSecurityMock = (hasAllRequested: boolean) => {
  const atSpace = jest.fn().mockResolvedValue({ hasAllRequested });
  const checkPrivilegesWithRequest = jest.fn().mockReturnValue({ atSpace });
  const actionFromRouteTag = jest.fn((tag: string) => `api:${tag}`);

  const security = {
    authz: {
      actions: { api: { actionFromRouteTag } },
      checkPrivilegesWithRequest,
    },
  } as unknown as SecurityPluginStart;

  return { security, atSpace, actionFromRouteTag };
};

describe('PrivilegeChecker', () => {
  describe('canRead', () => {
    it('checks the read API privilege for the given feature', async () => {
      const { security, atSpace, actionFromRouteTag } = createSecurityMock(true);
      const checker = new PrivilegeChecker(request, spaceId, security);

      await expect(checker.canRead('rules')).resolves.toBe(true);

      expect(actionFromRouteTag).toHaveBeenCalledWith(ALERTING_V2_API_PRIVILEGES.rules.read);
      expect(atSpace).toHaveBeenCalledWith(spaceId, {
        kibana: [`api:${ALERTING_V2_API_PRIVILEGES.rules.read}`],
      });
    });

    it('returns false when the user lacks the read privilege', async () => {
      const { security } = createSecurityMock(false);
      const checker = new PrivilegeChecker(request, spaceId, security);

      await expect(checker.canRead('rules')).resolves.toBe(false);
    });

    it('checks the correct privilege for action policies', async () => {
      const { security, actionFromRouteTag } = createSecurityMock(true);
      const checker = new PrivilegeChecker(request, spaceId, security);

      await checker.canRead('actionPolicies');

      expect(actionFromRouteTag).toHaveBeenCalledWith(
        ALERTING_V2_API_PRIVILEGES.actionPolicies.read
      );
    });
  });

  describe('canWrite', () => {
    it('checks the write API privilege for the given feature', async () => {
      const { security, atSpace, actionFromRouteTag } = createSecurityMock(true);
      const checker = new PrivilegeChecker(request, spaceId, security);

      await expect(checker.canWrite('rules')).resolves.toBe(true);

      expect(actionFromRouteTag).toHaveBeenCalledWith(ALERTING_V2_API_PRIVILEGES.rules.write);
      expect(atSpace).toHaveBeenCalledWith(spaceId, {
        kibana: [`api:${ALERTING_V2_API_PRIVILEGES.rules.write}`],
      });
    });

    it('returns false when the user lacks the write privilege', async () => {
      const { security } = createSecurityMock(false);
      const checker = new PrivilegeChecker(request, spaceId, security);

      await expect(checker.canWrite('rules')).resolves.toBe(false);
    });

    it('checks the correct privilege for action policies', async () => {
      const { security, actionFromRouteTag } = createSecurityMock(true);
      const checker = new PrivilegeChecker(request, spaceId, security);

      await checker.canWrite('actionPolicies');

      expect(actionFromRouteTag).toHaveBeenCalledWith(
        ALERTING_V2_API_PRIVILEGES.actionPolicies.write
      );
    });
  });
});
