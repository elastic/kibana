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
import { AuthService } from './auth_service';

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
      const privileges = {
        kibana: kibana.map((privilege) => ({ privilege, authorized: granted.includes(privilege) })),
      };
      return Promise.resolve({ hasAllRequested, privileges });
    }),
    atSpaces: jest.fn(),
  }));

  return security;
};

describe('AuthService', () => {
  const alertsAll = createRequestMock([
    ALERTING_V2_API_PRIVILEGES.alerts.read,
    ALERTING_V2_API_PRIVILEGES.alerts.write,
  ]);
  const alertsRead = createRequestMock([ALERTING_V2_API_PRIVILEGES.alerts.read]);
  const rulesAll = createRequestMock([
    ALERTING_V2_API_PRIVILEGES.rules.read,
    ALERTING_V2_API_PRIVILEGES.rules.write,
  ]);
  const execHistoryRead = createRequestMock([ALERTING_V2_API_PRIVILEGES.executionHistory.read]);
  const noAccess = createRequestMock([]);

  const security = createSecurity(
    new Map([
      [alertsAll.request, alertsAll.grantedActions],
      [alertsRead.request, alertsRead.grantedActions],
      [rulesAll.request, rulesAll.grantedActions],
      [execHistoryRead.request, execHistoryRead.grantedActions],
      [noAccess.request, noAccess.grantedActions],
    ])
  );

  describe('alerts:all user', () => {
    const authService = new AuthService(alertsAll.request, spaceId, security);

    it('authorizes reading alerts', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'read' })
      ).resolves.toBeUndefined();
    });

    it('authorizes writing alerts', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'write' })
      ).resolves.toBeUndefined();
    });

    it('does not authorize writing rules', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'rules', operation: 'write' })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 403 },
      });
    });
  });

  describe('alerts:read user', () => {
    const authService = new AuthService(alertsRead.request, spaceId, security);

    it('authorizes reading alerts', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'read' })
      ).resolves.toBeUndefined();
    });

    it('does not authorize writing alerts', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'write' })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 403 },
      });
    });
  });

  describe('execution_history:read user', () => {
    const authService = new AuthService(execHistoryRead.request, spaceId, security);

    it('authorizes reading execution history', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'executionHistory', operation: 'read' })
      ).resolves.toBeUndefined();
    });

    it('does not authorize reading alerts', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'read' })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 403 },
      });
    });
  });

  describe('no-access user', () => {
    const authService = new AuthService(noAccess.request, spaceId, security);

    it('does not authorize reading alerts', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'read' })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 403 },
      });
    });

    it('does not authorize writing alerts', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'write' })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 403 },
      });
    });

    it('names the denied feature privilege in the error message', async () => {
      await expect(
        authService.ensureAuthorized({ feature: 'alerts', operation: 'write' })
      ).rejects.toThrow('Unauthorized to access "Alerts: All"');
    });
  });

  describe('plumbing', () => {
    it('checks the feature write privilege against the request and space', async () => {
      const request = createRequestMock([ALERTING_V2_API_PRIVILEGES.alerts.write]);
      const testSecurity = createSecurity(new Map([[request.request, request.grantedActions]]));
      const authService = new AuthService(request.request, spaceId, testSecurity);

      await authService.ensureAuthorized({ feature: 'alerts', operation: 'write' });

      expect(testSecurity.authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(request.request);
      const atSpace = testSecurity.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpace;
      expect(atSpace).toHaveBeenCalledWith(spaceId, {
        kibana: [actionFor(ALERTING_V2_API_PRIVILEGES.alerts.write)],
      });
    });
  });
});
