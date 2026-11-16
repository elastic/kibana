/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult, TransportResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { authorizeKibanaInboundRequest } from './authorize_kibana_inbound_request';

type CheckPrivileges = (privileges: Record<string, never>) => Promise<{ hasAllRequested: boolean }>;

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    body: {},
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as DiagnosticResult['meta'],
  } as TransportResult);

const startServices = (
  checkPrivilegesDynamicallyWithRequest?: (request: KibanaRequest) => CheckPrivileges
): CoreSetup<{ security?: SecurityPluginStart }>['getStartServices'] => {
  const security = checkPrivilegesDynamicallyWithRequest
    ? { authz: { checkPrivilegesDynamicallyWithRequest } }
    : undefined;
  return jest.fn().mockResolvedValue([{}, { security }]);
};

describe('authorizeKibanaInboundRequest', () => {
  const request = httpServerMock.createKibanaRequest();

  it('allows a key that can access the request space', async () => {
    const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    const allowed = await authorizeKibanaInboundRequest(
      request,
      startServices(() => checkPrivileges)
    );

    expect(allowed).toBe(true);
    expect(checkPrivileges).toHaveBeenCalledWith({});
  });

  it('rejects a key with no Kibana access to the space', async () => {
    const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: false });
    const allowed = await authorizeKibanaInboundRequest(
      request,
      startServices(() => checkPrivileges)
    );

    expect(allowed).toBe(false);
  });

  it('rejects when security is not available', async () => {
    await expect(authorizeKibanaInboundRequest(request, startServices(undefined))).resolves.toBe(
      false
    );
  });

  it('rejects a 401 from the privilege check and rethrows anything else', async () => {
    const checkPrivileges = jest.fn().mockRejectedValueOnce(responseError(401));
    await expect(
      authorizeKibanaInboundRequest(
        request,
        startServices(() => checkPrivileges)
      )
    ).resolves.toBe(false);

    const failure = responseError(503);
    checkPrivileges.mockRejectedValueOnce(failure);
    await expect(
      authorizeKibanaInboundRequest(
        request,
        startServices(() => checkPrivileges)
      )
    ).rejects.toBe(failure);
  });
});
