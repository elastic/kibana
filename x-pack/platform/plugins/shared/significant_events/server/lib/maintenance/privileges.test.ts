/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  NIGHTSHIFT_ACTIVITY_MANAGE_PRIVILEGES,
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES,
} from '@kbn/nightshift-shared';
import type { SignificantEventsServer } from '../../types';
import { assertCanManageNightshiftActivityGlobally } from './privileges';

const request = {} as KibanaRequest;

const createServer = (authorizedPrivileges: string[]) => {
  const globally = jest.fn().mockResolvedValue({
    hasAllRequested: authorizedPrivileges.length === NIGHTSHIFT_ACTIVITY_MANAGE_PRIVILEGES.length,
    privileges: {
      kibana: NIGHTSHIFT_ACTIVITY_MANAGE_PRIVILEGES.map((privilege) => ({
        privilege,
        authorized: authorizedPrivileges.includes(privilege),
      })),
    },
  });
  const get = jest.fn().mockImplementation((privilege: string) => privilege);
  const server = {
    security: {
      authz: {
        actions: { api: { get } },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
      },
    },
  } as unknown as SignificantEventsServer;

  return { server, globally };
};

describe('assertCanManageNightshiftActivityGlobally', () => {
  it('allows Context Engine manage in every space', async () => {
    const { server, globally } = createServer([NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.manage]);

    await expect(
      assertCanManageNightshiftActivityGlobally({ request, server })
    ).resolves.toBeUndefined();
    expect(globally).toHaveBeenCalledWith({
      kibana: [...NIGHTSHIFT_ACTIVITY_MANAGE_PRIVILEGES],
    });
  });

  it('allows Detection Engine manage in every space', async () => {
    const { server } = createServer([NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.manage]);

    await expect(
      assertCanManageNightshiftActivityGlobally({ request, server })
    ).resolves.toBeUndefined();
  });

  it('denies when neither engine is granted in every space', async () => {
    const { server } = createServer([]);

    await expect(
      assertCanManageNightshiftActivityGlobally({ request, server })
    ).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
  });
});
