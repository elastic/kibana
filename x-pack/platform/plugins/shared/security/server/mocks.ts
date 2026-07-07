/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';

import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { lazyObject } from '@kbn/lazy-object';

import { auditServiceMock } from './audit/mocks';
import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { authorizationMock } from './authorization/index.mock';
import type { SecurityPluginSetup } from './plugin';
import { userProfileServiceMock } from './user_profile/user_profile_service.mock';
import { licenseMock } from '../common/licensing/index.mock';

function createSetupMock() {
  const mockAuthz = authorizationMock.create();
  return {
    audit: auditServiceMock.create(),
    authc: lazyObject({
      getCurrentUser: jest.fn(),
    }),
    authz: lazyObject({
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      checkPrivilegesDynamicallyWithRequest: mockAuthz.checkPrivilegesDynamicallyWithRequest,
      checkSavedObjectsPrivilegesWithRequest: mockAuthz.checkSavedObjectsPrivilegesWithRequest,
      mode: mockAuthz.mode,
    }),
    license: licenseMock.create(),
    privilegeDeprecationsService: lazyObject({
      getKibanaRolesByFeatureId: jest.fn(),
    }),
  } satisfies jest.Mocked<SecurityPluginSetup>;
}

function createStartMock() {
  const mockAuthz = authorizationMock.create();
  const mockAuthc = authenticationServiceMock.createStart();
  const mockUserProfiles = userProfileServiceMock.createStart();
  return lazyObject({
    authc: lazyObject({
      apiKeys: mockAuthc.apiKeys,
      getCurrentUser: mockAuthc.getCurrentUser,
    }),
    authz: lazyObject({
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      checkPrivilegesDynamicallyWithRequest: mockAuthz.checkPrivilegesDynamicallyWithRequest,
      checkSavedObjectsPrivilegesWithRequest: mockAuthz.checkSavedObjectsPrivilegesWithRequest,
      mode: mockAuthz.mode,
    }),
    userProfiles: lazyObject({
      getCurrent: mockUserProfiles.getCurrent,
      suggest: mockUserProfiles.suggest,
      bulkGet: mockUserProfiles.bulkGet,
    }),
  });
}

function createApiResponseMock<TResponse, TContext>(
  apiResponse: Pick<TransportResult<TResponse, TContext>, 'body'> &
    Partial<Omit<TransportResult<TResponse, TContext>, 'body'>>
): TransportResult<TResponse, TContext> {
  return {
    // @ts-expect-error null is not supported
    statusCode: null,
    // @ts-expect-error null is not supported
    headers: null,
    warnings: null,
    meta: {} as any,
    ...apiResponse,
  };
}

export const securityMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  createApiResponse: createApiResponseMock,
  createMockAuthenticatedUser: securityServiceMock.createMockAuthenticatedUser,
};
