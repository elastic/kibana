/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import {
  ESCALATIONS_API_PRIVILEGE_MANAGE,
  ESCALATIONS_API_PRIVILEGE_READ,
} from '../../escalations/constants';
import {
  INVESTIGATIONS_API_PRIVILEGE_MANAGE,
  INVESTIGATIONS_API_PRIVILEGE_READ,
} from '../constants';
import { createInvestigationsPrivilegesReader } from './check_investigations_privileges';

const request = httpServerMock.createKibanaRequest();

const createSecurity = (authorized: Record<string, boolean>) => {
  const checkPrivileges = jest.fn().mockImplementation(async ({ kibana }: { kibana: string[] }) => {
    const privileges = kibana.map((privilege) => ({
      privilege,
      authorized: authorized[privilege] === true,
    }));
    return {
      hasAllRequested: privileges.every((privilege) => privilege.authorized),
      privileges: { kibana: privileges },
    };
  });
  return {
    security: {
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      },
    } as unknown as SecurityPluginStart,
    checkPrivileges,
  };
};

const INVESTIGATIONS_READ = `api:${INVESTIGATIONS_API_PRIVILEGE_READ}`;
const INVESTIGATIONS_MANAGE = `api:${INVESTIGATIONS_API_PRIVILEGE_MANAGE}`;
const ESCALATIONS_READ = `api:${ESCALATIONS_API_PRIVILEGE_READ}`;
const ESCALATIONS_MANAGE = `api:${ESCALATIONS_API_PRIVILEGE_MANAGE}`;

describe('createInvestigationsPrivilegesReader', () => {
  it.each([
    [
      'read only',
      { [INVESTIGATIONS_READ]: true, [ESCALATIONS_READ]: true },
      { investigations: { read: true, manage: false }, escalations: { read: true, manage: false } },
    ],
    [
      'manage only, which implies read',
      { [INVESTIGATIONS_MANAGE]: true, [ESCALATIONS_MANAGE]: true },
      { investigations: { read: true, manage: true }, escalations: { read: true, manage: true } },
    ],
    [
      'investigations without escalations',
      { [INVESTIGATIONS_READ]: true, [INVESTIGATIONS_MANAGE]: true },
      { investigations: { read: true, manage: true }, escalations: { read: false, manage: false } },
    ],
    [
      'neither',
      {},
      {
        investigations: { read: false, manage: false },
        escalations: { read: false, manage: false },
      },
    ],
  ])('reports %s without throwing', async (_label, authorized, expected) => {
    const { security, checkPrivileges } = createSecurity(authorized);
    const reader = createInvestigationsPrivilegesReader({ getSecurity: async () => security });

    await expect(reader.getPrivileges(request)).resolves.toEqual(expected);
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [INVESTIGATIONS_READ, INVESTIGATIONS_MANAGE, ESCALATIONS_READ, ESCALATIONS_MANAGE],
    });
  });

  it('reports nothing when security is unavailable', async () => {
    const reader = createInvestigationsPrivilegesReader({ getSecurity: async () => undefined });

    await expect(reader.getPrivileges(request)).resolves.toEqual({
      investigations: { read: false, manage: false },
      escalations: { read: false, manage: false },
    });
  });
});
