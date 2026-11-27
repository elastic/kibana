/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';
import type { AccessPolicy } from '@kbn/ols';

import { type AccessPolicyRegistry, OlsService } from './ols_service';
import { getRecoveryAction } from './recovery';
import { Actions } from '..';
import { auditServiceMock } from '../../audit/mocks';
import { userProfileServiceMock } from '../../user_profile/user_profile_service.mock';
import { authorizationMock } from '../index.mock';

const actions = new Actions();

const POLICY: AccessPolicy = {
  generalAccess: ['none', 'edit'],
  defaultGeneralAccess: 'edit',
  entryAccess: ['use'],
  operations: {
    view: { access: 'view', privileges: { savedObject: [{ type: 'widget', operation: 'get' }] } },
    edit: {
      access: 'edit',
      privileges: { savedObject: [{ type: 'widget', operation: 'update' }] },
    },
    delete: {
      access: 'edit',
      privileges: { savedObject: [{ type: 'widget', operation: 'delete' }] },
    },
  },
};

describe('OlsService', () => {
  let policies: jest.Mocked<AccessPolicyRegistry>;
  let userProfiles: ReturnType<typeof userProfileServiceMock.createStart>;
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let scopedClusterClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let getAuthenticatedPrincipal: jest.Mock<AuthenticatedPrincipal | null, [KibanaRequest]>;

  const createOlsService = ({ enabled = true }: { enabled?: boolean } = {}) =>
    new OlsService({
      enabled,
      spacesEnabled: true,
      clusterClient,
      authz: { ...authorizationMock.create(), actions },
      audit: auditServiceMock.create(),
      policies,
      userProfiles,
      getAuthenticatedPrincipal,
      hasSession: jest.fn().mockResolvedValue(false),
      serviceAccountExists: jest.fn().mockResolvedValue(true),
      logger: loggingSystemMock.createLogger(),
    });

  beforeEach(() => {
    policies = {
      getAccessPolicy: jest.fn((type: string) => (type === 'widget' ? POLICY : undefined)),
      getAllTypes: jest.fn().mockReturnValue([{ name: 'widget' }, { name: 'widget_task' }]),
    };
    userProfiles = userProfileServiceMock.createStart();
    userProfiles.getCurrentProfileId.mockResolvedValue('u_user');
    clusterClient = elasticsearchServiceMock.createClusterClient();
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    clusterClient.asScoped.mockReturnValue(scopedClusterClient);
    scopedClusterClient.asCurrentUser.security.getApiKey.mockResolvedValue({ api_keys: [] });
    getAuthenticatedPrincipal = jest.fn().mockReturnValue({ type: 'user', username: 'user' });
  });

  describe('#isEnabled', () => {
    it('reflects the setting', () => {
      expect(createOlsService().isEnabled()).toBe(true);
      expect(createOlsService({ enabled: false }).isEnabled()).toBe(false);
    });
  });

  describe('#asScoped', () => {
    it('shares the request state between scoped services of one request', async () => {
      const olsService = createOlsService();
      const request = httpServerMock.createKibanaRequest();

      await olsService.asScoped(request).getPrincipal();
      await olsService.asScoped(request).getPrincipal();

      expect(userProfiles.getCurrentProfileId).toHaveBeenCalledTimes(1);
    });

    it('keeps the state of different requests apart', async () => {
      const olsService = createOlsService();

      await olsService.asScoped(httpServerMock.createKibanaRequest()).getPrincipal();
      await olsService.asScoped(httpServerMock.createKibanaRequest()).getPrincipal();

      expect(userProfiles.getCurrentProfileId).toHaveBeenCalledTimes(2);
    });
  });

  describe('#getRecoveryActions', () => {
    const recoveryAction = getRecoveryAction(actions, 'widget');

    it('returns recovery for each type with an access policy that the check asks about', () => {
      expect(
        createOlsService().getRecoveryActions([
          actions.savedObject.get('widget', 'get'),
          actions.savedObject.get('widget_task', 'create'),
        ])
      ).toEqual(new Map([[recoveryAction, 'widget']]));
    });

    it('returns nothing for a check that asks about no type with an access policy', () => {
      expect(
        createOlsService().getRecoveryActions([
          actions.savedObject.get('widget_task', 'create'),
          actions.api.get('widgets:read'),
        ])
      ).toEqual(new Map());
    });

    it('returns nothing while OLS is disabled, without reading the registry', () => {
      expect(
        createOlsService({ enabled: false }).getRecoveryActions([
          actions.savedObject.get('widget', 'get'),
        ])
      ).toEqual(new Map());
      expect(policies.getAllTypes).not.toHaveBeenCalled();
    });

    it('returns nothing while no type has an access policy, so privilege checks stay unchanged', () => {
      policies.getAccessPolicy.mockReturnValue(undefined);

      expect(
        createOlsService().getRecoveryActions([actions.savedObject.get('widget', 'get')])
      ).toEqual(new Map());
    });

    it('reads the registered types once', () => {
      const olsService = createOlsService();

      olsService.getRecoveryActions([actions.savedObject.get('widget', 'get')]);
      olsService.getRecoveryActions([actions.savedObject.get('widget', 'update')]);

      expect(policies.getAllTypes).toHaveBeenCalledTimes(1);
    });
  });
});
