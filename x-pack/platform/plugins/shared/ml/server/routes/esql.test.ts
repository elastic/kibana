/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlService } from '@kbn/esql-server-utils';
import { esqlRoutes } from './esql';
import type { RouteInitialization } from '../types';

jest.mock('@kbn/esql-server-utils', () => ({ EsqlService: jest.fn() }));

const getColumns = jest.fn();

const buildMocks = () => {
  const addVersion = jest.fn();
  const post = jest.fn(() => ({ addVersion }));
  const router = { versioned: { post } };
  const fullLicenseAPIGuard = jest.fn(
    (handler: (args: { client: unknown; request: unknown; response: unknown }) => unknown) =>
      (context: { client: unknown }, request: unknown, response: unknown) =>
        handler({ client: context.client, request, response })
  );
  const routeGuard = { fullLicenseAPIGuard };
  const response = {
    ok: jest.fn((result) => result),
    customError: jest.fn((result) => result),
  };
  const asCurrentUser = { esql: { query: jest.fn() } };

  return {
    addVersion,
    asCurrentUser,
    fullLicenseAPIGuard,
    getColumns,
    post,
    response,
    routeGuard,
    router,
  };
};

describe('esqlRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(EsqlService).mockImplementation(() => ({ getColumns } as unknown as EsqlService));
  });

  it('registers the versioned, guarded columns route with bounded request and response schemas', () => {
    const { addVersion, fullLicenseAPIGuard, post, routeGuard, router } = buildMocks();

    esqlRoutes({ router, routeGuard } as unknown as RouteInitialization);

    expect(post).toHaveBeenCalledWith({
      path: '/internal/ml/esql/columns',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['ml:canCreateJob'] } },
      summary: 'Gets ES|QL query columns',
      description: expect.any(String),
    });
    expect(fullLicenseAPIGuard).toHaveBeenCalledWith(expect.any(Function));
    const [version] = addVersion.mock.calls[0];
    expect(version.version).toBe('1');
    expect(version.validate.request.body.validate({ query: 'FROM logs-*' })).toEqual({
      query: 'FROM logs-*',
    });
    expect(() => version.validate.request.body.validate({ query: '' })).toThrow();
    expect(() => version.validate.request.body.validate({ query: '  ' })).toThrow();
    expect(() =>
      version.validate.request.body.validate({ query: 'x'.repeat(1_000_001) })
    ).toThrow();
    expect(
      version.validate.response[200].body().validate({
        columns: [{ name: 'bucket', type: 'date', hasConflict: false, userDefined: false }],
      })
    ).toEqual({
      columns: [{ name: 'bucket', type: 'date', hasConflict: false, userDefined: false }],
    });
  });

  it('uses the current-user client and returns normalized columns without values', async () => {
    const { addVersion, asCurrentUser, response, routeGuard, router } = buildMocks();
    getColumns.mockResolvedValue([
      { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
    ]);
    esqlRoutes({ router, routeGuard } as unknown as RouteInitialization);
    const [, handler] = addVersion.mock.calls[0];

    await handler({ client: { asCurrentUser } }, { body: { query: 'FROM logs-*' } }, response);

    expect(EsqlService).toHaveBeenCalledWith({ client: asCurrentUser });
    expect(getColumns).toHaveBeenCalledWith('FROM logs-*');
    expect(response.ok).toHaveBeenCalledWith({
      body: { columns: [{ name: 'bucket', type: 'date', hasConflict: false, userDefined: false }] },
    });
  });

  it('preserves the Elasticsearch error reason through wrapError', async () => {
    const { addVersion, asCurrentUser, response, routeGuard, router } = buildMocks();
    const error = Object.assign(new Error('ES|QL query failed'), {
      body: { error: { reason: 'unknown column [missing]' } },
      status: 400,
    });
    getColumns.mockRejectedValue(error);
    esqlRoutes({ router, routeGuard } as unknown as RouteInitialization);
    const [, handler] = addVersion.mock.calls[0];

    await handler({ client: { asCurrentUser } }, { body: { query: 'FROM logs-*' } }, response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ attributes: { body: error.body } }),
      })
    );
  });
});
