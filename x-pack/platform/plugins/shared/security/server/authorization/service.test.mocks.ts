/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const mockCheckPrivilegesFactory = vi.fn();
vi.mock('./check_privileges', () => {
  const mocked = {
    checkPrivilegesFactory: mockCheckPrivilegesFactory,
  };
  return { ...mocked, default: mocked };
});

export const mockCheckPrivilegesDynamicallyWithRequestFactory = vi.fn();
vi.mock('./check_privileges_dynamically', () => {
  const mocked = {
    checkPrivilegesDynamicallyWithRequestFactory: mockCheckPrivilegesDynamicallyWithRequestFactory,
  };
  return { ...mocked, default: mocked };
});

export const mockCheckSavedObjectsPrivilegesWithRequestFactory = vi.fn();
vi.mock('./check_saved_objects_privileges', () => {
  const mocked = {
    checkSavedObjectsPrivilegesWithRequestFactory:
      mockCheckSavedObjectsPrivilegesWithRequestFactory,
  };
  return { ...mocked, default: mocked };
});

export const mockPrivilegesFactory = vi.fn();
vi.mock('@kbn/security-authorization-core', async () => {
  const authzCore = await vi.importActual('@kbn/security-authorization-core');
  return {
    ...authzCore,
    privilegesFactory: mockPrivilegesFactory,
  };
});

export const mockAuthorizationModeFactory = vi.fn();
vi.mock('./mode', () => {
  const mocked = {
    authorizationModeFactory: mockAuthorizationModeFactory,
  };
  return { ...mocked, default: mocked };
});

export const mockRegisterPrivilegesWithCluster = vi.fn();
vi.mock('./register_privileges_with_cluster', () => {
  const mocked = {
    registerPrivilegesWithCluster: mockRegisterPrivilegesWithCluster,
  };
  return { ...mocked, default: mocked };
});
