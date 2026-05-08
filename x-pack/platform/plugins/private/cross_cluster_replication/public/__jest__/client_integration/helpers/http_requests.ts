/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptionsWithPath } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { API_BASE_PATH } from '../../../../common/constants';
import type { AutoFollowPattern, AutoFollowStats, FollowerIndex } from '../../../../common/types';
import type { DeleteAutoFollowPatternResponse, RemoteClusterRow } from '../../../app/services/api';

type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';

type HttpSetupMock = ReturnType<typeof httpServiceMock.createSetupContract>;

const resolvePath = (pathOrOptions: string | HttpFetchOptionsWithPath): string =>
  typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;

type MockHttpError =
  | string
  | { body: string }
  | { message: string }
  | { body: { message: string } };

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (httpSetup: HttpSetupMock) => {
  const mockResponses = new Map<HttpMethod, Map<string, Promise<unknown>>>(
    ['GET', 'PUT', 'DELETE', 'POST'].map(
      (method) => [method, new Map()] as [HttpMethod, Map<string, Promise<unknown>>]
    )
  );

  const mockMethodImplementation = (method: HttpMethod, path: string) => {
    return mockResponses.get(method)?.get(path) ?? Promise.resolve({});
  };

  httpSetup.get.mockImplementation((path) => mockMethodImplementation('GET', resolvePath(path)));
  httpSetup.delete.mockImplementation((path) =>
    mockMethodImplementation('DELETE', resolvePath(path))
  );
  httpSetup.post.mockImplementation((path) => mockMethodImplementation('POST', resolvePath(path)));
  httpSetup.put.mockImplementation((path) => mockMethodImplementation('PUT', resolvePath(path)));

  const mockResponse = (
    method: HttpMethod,
    path: string,
    response?: unknown,
    error?: MockHttpError
  ) => {
    const defuse = (promise: Promise<unknown>) => {
      promise.catch(() => {});
      return promise;
    };

    const createHttpFetchError = (mockError: MockHttpError) => {
      const isObject = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null;

      const getBody = (mockErr: MockHttpError): unknown => {
        if (typeof mockErr === 'string') {
          return mockErr;
        }

        return 'body' in mockErr ? mockErr.body : mockErr;
      };

      const body = getBody(mockError);

      const message = (() => {
        if (typeof body === 'string') {
          return body;
        }

        if (isObject(body) && 'message' in body) {
          return String(body.message);
        }

        return 'Request failed';
      })();

      const request: HttpFetchOptionsWithPath = { path };

      const httpError = Object.assign(new Error(message), { body, request });

      if (isObject(body) && 'statusCode' in body && typeof body.statusCode === 'number') {
        Object.assign(httpError, { response: { status: body.statusCode } });
      }

      return httpError;
    };

    return mockResponses
      .get(method)!
      .set(
        path,
        error ? defuse(Promise.reject(createHttpFetchError(error))) : Promise.resolve(response)
      );
  };

  const setLoadFollowerIndicesResponse = (
    response: { indices: FollowerIndex[] } = { indices: [] },
    error?: MockHttpError
  ) => mockResponse('GET', `${API_BASE_PATH}/follower_indices`, response, error);

  const setLoadAutoFollowPatternsResponse = (
    response: { patterns: AutoFollowPattern[] } = { patterns: [] },
    error?: MockHttpError
  ) => mockResponse('GET', `${API_BASE_PATH}/auto_follow_patterns`, response, error);

  const setDeleteAutoFollowPatternResponse = (
    autoFollowId?: string,
    response?: DeleteAutoFollowPatternResponse,
    error?: MockHttpError
  ) =>
    mockResponse(
      'DELETE',
      `${API_BASE_PATH}/auto_follow_patterns/${autoFollowId}`,
      response,
      error
    );

  const setAutoFollowStatsResponse = (response?: Partial<AutoFollowStats>, error?: MockHttpError) =>
    mockResponse('GET', `${API_BASE_PATH}/stats/auto_follow`, response, error);

  const setLoadRemoteClustersResponse = (
    response: Array<RemoteClusterRow & { seeds?: string[] }> = [],
    error?: MockHttpError
  ) => mockResponse('GET', '/api/remote_clusters', response, error);

  const setGetAutoFollowPatternResponse = (
    patternId: string,
    response: AutoFollowPattern,
    error?: MockHttpError
  ) => mockResponse('GET', `${API_BASE_PATH}/auto_follow_patterns/${patternId}`, response, error);

  const setGetClusterIndicesResponse = (
    response: Array<{ name: string }> = [],
    error?: MockHttpError
  ) => mockResponse('GET', '/api/index_management/indices', response, error);

  const setGetFollowerIndexResponse = (
    followerIndexId: string,
    response: FollowerIndex,
    error?: MockHttpError
  ) => mockResponse('GET', `${API_BASE_PATH}/follower_indices/${followerIndexId}`, response, error);

  return {
    setLoadFollowerIndicesResponse,
    setLoadAutoFollowPatternsResponse,
    setDeleteAutoFollowPatternResponse,
    setAutoFollowStatsResponse,
    setLoadRemoteClustersResponse,
    setGetAutoFollowPatternResponse,
    setGetClusterIndicesResponse,
    setGetFollowerIndexResponse,
  };
};

export type HttpRequestsMockHelpers = ReturnType<typeof registerHttpRequestMockHelpers>;

export const init = () => {
  const httpSetup = httpServiceMock.createSetupContract();

  return {
    httpSetup,
    httpRequestsMockHelpers: registerHttpRequestMockHelpers(httpSetup),
  };
};

export type InitHttpRequestsResult = ReturnType<typeof init>;
