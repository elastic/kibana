/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { ALERTING_V2_API_PRIVILEGES } from '../../../../common/feature_privileges';
import { PrivilegeChecker } from './privilege_checker';

const spaceId = 'default';

// securityMock stubs ApiActions, so pull the real class for actionFromRouteTag.
const { ApiActions } = jest.requireActual(
  '@kbn/security-authorization-core/src/actions/api'
) as typeof import('@kbn/security-authorization-core/src/actions/api');
const apiActions = new ApiActions();

const actionFor = (privilege: string) => apiActions.actionFromRouteTag(privilege);

const createRequestMock = (grantedPrivileges: string[]) => {
  const request = httpServerMock.createKibanaRequest();
  const grantedActions = grantedPrivileges.map(actionFor);
  return { request, grantedActions };
};

// securityMock has no privilege-check mock implementation, so map granted actions per request.
const createSecurity = (privilegesByRequest: Map<KibanaRequest, string[]>) => {
  const security = securityMock.createStart();

  jest
    .mocked(security.authz.actions.api.actionFromRouteTag)
    .mockImplementation((tag: string) => apiActions.actionFromRouteTag(tag));

  security.authz.checkPrivilegesWithRequest.mockImplementation((req: KibanaRequest) => ({
    globally: jest.fn(),
    atSpace: jest.fn().mockImplementation((_sid: string, { kibana }: { kibana: string[] }) => {
      const granted = privilegesByRequest.get(req) ?? [];
      const hasAllRequested = kibana.every((action) => granted.includes(action));
      return Promise.resolve({ hasAllRequested });
    }),
    atSpaces: jest.fn(),
  }));

  return security;
};

describe('PrivilegeChecker', () => {
  const rulesAll = createRequestMock([
    ALERTING_V2_API_PRIVILEGES.rules.read,
    ALERTING_V2_API_PRIVILEGES.rules.write,
  ]);
  const rulesRead = createRequestMock([ALERTING_V2_API_PRIVILEGES.rules.read]);
  const actionPoliciesAll = createRequestMock([
    ALERTING_V2_API_PRIVILEGES.actionPolicies.read,
    ALERTING_V2_API_PRIVILEGES.actionPolicies.write,
  ]);
  const actionPoliciesRead = createRequestMock([ALERTING_V2_API_PRIVILEGES.actionPolicies.read]);
  const alertsAll = createRequestMock([
    ALERTING_V2_API_PRIVILEGES.alerts.read,
    ALERTING_V2_API_PRIVILEGES.alerts.write,
  ]);
  const alertsRead = createRequestMock([ALERTING_V2_API_PRIVILEGES.alerts.read]);
  const execHistoryAll = createRequestMock([ALERTING_V2_API_PRIVILEGES.executionHistory.read]);
  const execHistoryRead = createRequestMock([ALERTING_V2_API_PRIVILEGES.executionHistory.read]);
  const noAccess = createRequestMock([]);

  const security = createSecurity(
    new Map([
      [rulesAll.request, rulesAll.grantedActions],
      [rulesRead.request, rulesRead.grantedActions],
      [actionPoliciesAll.request, actionPoliciesAll.grantedActions],
      [actionPoliciesRead.request, actionPoliciesRead.grantedActions],
      [alertsAll.request, alertsAll.grantedActions],
      [alertsRead.request, alertsRead.grantedActions],
      [execHistoryAll.request, execHistoryAll.grantedActions],
      [execHistoryRead.request, execHistoryRead.grantedActions],
      [noAccess.request, noAccess.grantedActions],
    ])
  );

  describe('rules:all user', () => {
    const checker = new PrivilegeChecker(rulesAll.request, spaceId, security);

    it('can read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(true);
    });

    it('can write rules', async () => {
      await expect(checker.canWrite('rules')).resolves.toBe(true);
    });

    it('cannot read action policies', async () => {
      await expect(checker.canRead('actionPolicies')).resolves.toBe(false);
    });

    it('cannot write action policies', async () => {
      await expect(checker.canWrite('actionPolicies')).resolves.toBe(false);
    });

    it('cannot read alerts', async () => {
      await expect(checker.canRead('alerts')).resolves.toBe(false);
    });

    it('cannot read execution history', async () => {
      await expect(checker.canRead('executionHistory')).resolves.toBe(false);
    });
  });

  describe('rules:read user', () => {
    const checker = new PrivilegeChecker(rulesRead.request, spaceId, security);

    it('can read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(true);
    });

    it('cannot write rules', async () => {
      await expect(checker.canWrite('rules')).resolves.toBe(false);
    });

    it('cannot read action policies', async () => {
      await expect(checker.canRead('actionPolicies')).resolves.toBe(false);
    });
  });

  describe('action_policies:all user', () => {
    const checker = new PrivilegeChecker(actionPoliciesAll.request, spaceId, security);

    it('can read action policies', async () => {
      await expect(checker.canRead('actionPolicies')).resolves.toBe(true);
    });

    it('can write action policies', async () => {
      await expect(checker.canWrite('actionPolicies')).resolves.toBe(true);
    });

    it('cannot read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(false);
    });

    it('cannot write rules', async () => {
      await expect(checker.canWrite('rules')).resolves.toBe(false);
    });

    it('cannot read alerts', async () => {
      await expect(checker.canRead('alerts')).resolves.toBe(false);
    });

    it('cannot read execution history', async () => {
      await expect(checker.canRead('executionHistory')).resolves.toBe(false);
    });
  });

  describe('action_policies:read user', () => {
    const checker = new PrivilegeChecker(actionPoliciesRead.request, spaceId, security);

    it('can read action policies', async () => {
      await expect(checker.canRead('actionPolicies')).resolves.toBe(true);
    });

    it('cannot write action policies', async () => {
      await expect(checker.canWrite('actionPolicies')).resolves.toBe(false);
    });

    it('cannot read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(false);
    });
  });

  describe('alerts:all user', () => {
    const checker = new PrivilegeChecker(alertsAll.request, spaceId, security);

    it('can read alerts', async () => {
      await expect(checker.canRead('alerts')).resolves.toBe(true);
    });

    it('cannot read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(false);
    });

    it('cannot read action policies', async () => {
      await expect(checker.canRead('actionPolicies')).resolves.toBe(false);
    });

    it('cannot read execution history', async () => {
      await expect(checker.canRead('executionHistory')).resolves.toBe(false);
    });
  });

  describe('alerts:read user', () => {
    const checker = new PrivilegeChecker(alertsRead.request, spaceId, security);

    it('can read alerts', async () => {
      await expect(checker.canRead('alerts')).resolves.toBe(true);
    });

    it('cannot read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(false);
    });
  });

  describe('execution_history:all user', () => {
    const checker = new PrivilegeChecker(execHistoryAll.request, spaceId, security);

    it('can read execution history', async () => {
      await expect(checker.canRead('executionHistory')).resolves.toBe(true);
    });

    it('cannot read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(false);
    });

    it('cannot read action policies', async () => {
      await expect(checker.canRead('actionPolicies')).resolves.toBe(false);
    });

    it('cannot read alerts', async () => {
      await expect(checker.canRead('alerts')).resolves.toBe(false);
    });
  });

  describe('execution_history:read user', () => {
    const checker = new PrivilegeChecker(execHistoryRead.request, spaceId, security);

    it('can read execution history', async () => {
      await expect(checker.canRead('executionHistory')).resolves.toBe(true);
    });

    it('cannot read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(false);
    });
  });

  describe('no-access user', () => {
    const checker = new PrivilegeChecker(noAccess.request, spaceId, security);

    it('cannot read rules', async () => {
      await expect(checker.canRead('rules')).resolves.toBe(false);
    });

    it('cannot write rules', async () => {
      await expect(checker.canWrite('rules')).resolves.toBe(false);
    });

    it('cannot read action policies', async () => {
      await expect(checker.canRead('actionPolicies')).resolves.toBe(false);
    });

    it('cannot write action policies', async () => {
      await expect(checker.canWrite('actionPolicies')).resolves.toBe(false);
    });

    it('cannot read alerts', async () => {
      await expect(checker.canRead('alerts')).resolves.toBe(false);
    });

    it('cannot read execution history', async () => {
      await expect(checker.canRead('executionHistory')).resolves.toBe(false);
    });
  });

  describe('plumbing', () => {
    it('passes the correct request to checkPrivilegesWithRequest', async () => {
      const checker = new PrivilegeChecker(rulesAll.request, spaceId, security);
      await checker.canRead('rules');

      expect(security.authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(rulesAll.request);
    });

    it('passes the spaceId to atSpace', async () => {
      const testRequest = createRequestMock([ALERTING_V2_API_PRIVILEGES.rules.read]);
      const testSecurity = createSecurity(
        new Map([[testRequest.request, testRequest.grantedActions]])
      );
      const checker = new PrivilegeChecker(testRequest.request, spaceId, testSecurity);
      await checker.canRead('rules');

      const atSpace = testSecurity.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpace;
      expect(atSpace).toHaveBeenCalledWith(spaceId, expect.any(Object));
    });
  });
});
