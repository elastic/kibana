/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetchMock from 'fetch-mock';

import type { HttpSetup } from '@kbn/core/public';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { setup } from '@kbn/core-test-helpers-http-setup-browser';

import { SessionExpired } from './session_expired';
import { UnauthorizedResponseHttpInterceptor } from './unauthorized_response_http_interceptor';
import { SESSION_ERROR_REASON_HEADER } from '../../common/constants';
import { LogoutReason } from '../../common/types';

jest.mock('./session_expired');

const drainPromiseQueue = () => {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
};

const mockCurrentUrl = (url: string) => window.history.pushState({}, '', url);

const setupHttp = (basePath: string) => {
  const { http } = setup((injectedMetadata) => {
    injectedMetadata.getBasePath.mockReturnValue(basePath);
  });
  return http as HttpSetup;
};
const tenant = '';
const application = applicationServiceMock.createStartContract();

afterEach(() => {
  fetchMock.restore();
});

for (const reason of [
  LogoutReason.AUTHENTICATION_ERROR,
  LogoutReason.SESSION_EXPIRED,
  LogoutReason.CONCURRENCY_LIMIT,
]) {
  const headers =
    reason === LogoutReason.SESSION_EXPIRED || reason === LogoutReason.CONCURRENCY_LIMIT
      ? { [SESSION_ERROR_REASON_HEADER]: reason }
      : undefined;

  it(`logs out 401 responses (reason: ${reason})`, async () => {
    const http = setupHttp('/foo');
    const sessionExpired = new SessionExpired(application, `${http.basePath}/logout`, tenant);
    const logoutPromise = new Promise<void>((resolve) => {
      jest.spyOn(sessionExpired, 'logout').mockImplementation(() => resolve());
    });
    const interceptor = new UnauthorizedResponseHttpInterceptor(
      sessionExpired,
      http.anonymousPaths
    );
    http.intercept(interceptor);
    fetchMock.mock('*', { status: 401, headers });

    let fetchResolved = false;
    let fetchRejected = false;
    http.fetch('/foo-api').then(
      () => (fetchResolved = true),
      () => (fetchRejected = true)
    );

    await logoutPromise;
    await drainPromiseQueue();
    expect(fetchResolved).toBe(false);
    expect(fetchRejected).toBe(false);
    expect(sessionExpired.logout).toHaveBeenCalledWith(reason);
  });
}

it(`ignores anonymous paths`, async () => {
  mockCurrentUrl('/foo/bar');
  const http = setupHttp('/foo');
  const { anonymousPaths } = http;
  anonymousPaths.register('/bar');
  const sessionExpired = new SessionExpired(application, `${http.basePath}/logout`, tenant);
  const interceptor = new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths);
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});

it(`ignores errors which don't have a response, for example network connectivity issues`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(application, `${http.basePath}/logout`, tenant);
  const interceptor = new UnauthorizedResponseHttpInterceptor(sessionExpired, http.anonymousPaths);
  http.intercept(interceptor);
  fetchMock.mock('*', new Promise((resolve, reject) => reject(new Error('Network is down'))));

  await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Network is down]`);
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});

it(`ignores requests which omit credentials`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(application, `${http.basePath}/logout`, tenant);
  const interceptor = new UnauthorizedResponseHttpInterceptor(sessionExpired, http.anonymousPaths);
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  await expect(http.fetch('/foo-api', { credentials: 'omit' })).rejects.toMatchInlineSnapshot(
    `[Error: Unauthorized]`
  );
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});
