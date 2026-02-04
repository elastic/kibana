/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { of, BehaviorSubject, NEVER } from 'rxjs';
import { createOnPreResponseHandler } from './on_pre_response_handler';
import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { licenseMock } from '../common/licensing.mock';

describe('createOnPreResponseHandler', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  it('sets license.signature header immediately for non-error responses', async () => {
    const refresh = jest.fn();
    const toolkit = httpServiceMock.createOnPreResponseToolkit();

    const interceptor = createOnPreResponseHandler(
      refresh,
      of(licenseMock.createLicense({ signature: 'foo' }))
    );
    await interceptor(httpServerMock.createKibanaRequest(), { statusCode: 200 }, toolkit);

    expect(refresh).toHaveBeenCalledTimes(0);
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-license-sig': 'foo',
      },
    });
  });
  it('sets license.signature header immediately for 429 error responses', async () => {
    const refresh = jest.fn();
    const toolkit = httpServiceMock.createOnPreResponseToolkit();

    const interceptor = createOnPreResponseHandler(
      refresh,
      of(licenseMock.createLicense({ signature: 'foo' }))
    );
    await interceptor(httpServerMock.createKibanaRequest(), { statusCode: 429 }, toolkit);

    expect(refresh).toHaveBeenCalledTimes(0);
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-license-sig': 'foo',
      },
    });
  });
  it('sets license.signature header after refresh for other error responses', async () => {
    const updatedLicense = licenseMock.createLicense({ signature: 'bar' });
    const license$ = new BehaviorSubject(licenseMock.createLicense({ signature: 'foo' }));
    const refresh = jest.fn().mockImplementation(() => {
      return new Promise((resolve) =>
        setTimeout(() => {
          license$.next(updatedLicense);
          resolve(undefined);
        }, 1)
      );
    });

    const toolkit = httpServiceMock.createOnPreResponseToolkit();

    const interceptor = createOnPreResponseHandler(refresh, license$);
    await interceptor(httpServerMock.createKibanaRequest(), { statusCode: 400 }, toolkit);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-license-sig': 'foo',
      },
    });

    jest.advanceTimersByTime(10);

    await interceptor(httpServerMock.createKibanaRequest(), { statusCode: 400 }, toolkit);

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(toolkit.next).toHaveBeenCalledTimes(2);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-license-sig': 'bar',
      },
    });
  });

  it('sets unknown if license.signature is unset', async () => {
    const refresh = jest.fn();
    const toolkit = httpServiceMock.createOnPreResponseToolkit();
    const noLicense$ = NEVER;

    const interceptor = createOnPreResponseHandler(refresh, noLicense$);
    await interceptor(httpServerMock.createKibanaRequest(), { statusCode: 200 }, toolkit);

    expect(refresh).toHaveBeenCalledTimes(0);
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-license-sig': 'unknown',
      },
    });
  });
});
