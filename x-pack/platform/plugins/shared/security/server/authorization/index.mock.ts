/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '@kbn/security-authorization-core/src/actions/actions.mock';
import type { AuthorizationMode } from '@kbn/security-plugin-types-server';

export const authorizationMock = {
  create: ({
    version = 'mock-version',
    applicationName = 'mock-application',
  }: { version?: string; applicationName?: string } = {}) => ({
    actions: actionsMock.create(version),
    checkPrivilegesWithRequest: jest.fn(),
    checkUserProfilesPrivileges: jest.fn(),
    checkElasticsearchPrivilegesWithRequest: jest.fn(),
    checkPrivilegesDynamicallyWithRequest: jest.fn(),
    checkSavedObjectsPrivilegesWithRequest: jest.fn(),
    applicationName,
    mode: { useRbacForRequest: jest.fn() } as jest.Mocked<AuthorizationMode>,
    privileges: { get: jest.fn() },
    registerPrivilegesWithCluster: jest.fn(),
    disableUnauthorizedCapabilities: jest.fn(),
  }),
};
