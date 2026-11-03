/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { plugin } from '.';

describe('security in a task runtime', () => {
  const setup = async () => {
    // Answers like Elasticsearch: every requested privilege at every requested resource is granted.
    const hasPrivileges = jest.fn(
      async (body: {
        application: Array<{ application: string; resources: string[]; privileges: string[] }>;
      }) => {
        const [{ application, resources, privileges }] = body.application;
        return {
          username: 'elastic',
          has_all_requested: true,
          cluster: {},
          index: {},
          application: {
            [application]: Object.fromEntries(
              resources.map((resource) => [
                resource,
                Object.fromEntries(privileges.map((privilege) => [privilege, true])),
              ])
            ),
          },
        };
      }
    );
    const asScoped = jest.fn(() => ({ asCurrentUser: { security: { hasPrivileges } } }));
    const context = { logger: loggingSystemMock.create() } as never;
    const instance = await plugin(context);
    instance.setup({ savedObjects: { getDefaultIndex: () => '.kibana' } } as never);
    const start = instance.start(
      {
        elasticsearch: { client: { asScoped, asInternalUser: {} } },
        security: { authc: {} },
      } as never,
      { spaces: { spacesService: { getSpaceId: () => 'default' } } } as never
    );
    return { start, hasPrivileges, asScoped };
  };

  it('checks a request with an Elasticsearch has_privileges call as the request user', async () => {
    const { start, hasPrivileges, asScoped } = await setup();
    const request = { headers: { authorization: 'ApiKey abc' } } as unknown as KibanaRequest;

    const privilege = start.authz.actions.api.get('foo');
    const result = await start.authz
      .checkPrivilegesWithRequest(request)
      .atSpace('default', { kibana: [privilege] });

    expect(asScoped).toHaveBeenCalledWith(request);
    expect(hasPrivileges).toHaveBeenCalledWith(
      expect.objectContaining({
        application: [
          expect.objectContaining({
            application: 'kibana-.kibana',
            resources: ['space:default'],
            // Like Kibana, the check also requires the login action.
            privileges: expect.arrayContaining([privilege, start.authz.actions.login]),
          }),
        ],
      })
    );
    expect(result.hasAllRequested).toBe(true);
  });

  it('checks in the space of the request when asked dynamically', async () => {
    const { start, hasPrivileges } = await setup();
    const request = { headers: {} } as unknown as KibanaRequest;

    await start.authz.checkPrivilegesDynamicallyWithRequest(request)({
      kibana: [start.authz.actions.api.get('foo')],
    });

    expect(hasPrivileges).toHaveBeenCalledWith(
      expect.objectContaining({
        application: [expect.objectContaining({ resources: ['space:default'] })],
      })
    );
  });

  it('uses role based checks for every request', async () => {
    const { start } = await setup();
    expect(start.authz.mode.useRbacForRequest({} as KibanaRequest)).toBe(true);
  });
});
