/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reTryOneTimeOnErrorHandler, errorLinkHandler } from '.';
import { ServerError } from 'apollo-link-http-common';
import { Operation } from 'apollo-link';
import { GraphQLError } from 'graphql';
import * as store from '../../store';
import { onError } from 'apollo-link-error';

const mockDispatch = jest.fn();
jest.mock('apollo-link-error');
jest.mock('../../store');
// @ts-ignore
store.getStore.mockReturnValue({ dispatch: mockDispatch });

describe('errorLinkHandler', () => {
  const mockGraphQLErrors: GraphQLError = {
    message: 'GraphQLError',
  } as GraphQLError;
  const mockNetworkError: ServerError = {
    result: {},
    statusCode: 503,
    name: '',
    message: 'error',
    response: {
      ok: false,
    } as Response,
  };
  const mockOperation: Operation = {} as Operation;
  const mockForward = jest.fn();

  afterEach(() => {
    mockDispatch.mockClear();
  });

  test('it should display error if graphQLErrors exist', () => {
    errorLinkHandler({
      graphQLErrors: [mockGraphQLErrors],
      operation: mockOperation,
      forward: mockForward,
    });

    expect(store.getStore).toBeCalled();
    expect(mockDispatch.mock.calls.length).toBe(1);
  });

  test('it should display error if networkError exist', () => {
    errorLinkHandler({
      networkError: mockNetworkError,
      operation: mockOperation,
      forward: mockForward,
    });

    expect(store.getStore).toBeCalled();
    expect(mockDispatch.mock.calls.length).toBe(1);
  });
});

describe('errorLink', () => {
  test('onError should be called with errorLinkHandler', () => {
    expect(onError).toHaveBeenCalledWith(errorLinkHandler);
  });
});

describe('reTryOneTimeOnErrorHandler', () => {
  const mockNetworkError: ServerError = {
    result: {},
    statusCode: 503,
    name: '',
    message: 'error',
    response: {
      ok: false,
    } as Response,
  };
  const mockOperation: Operation = {} as Operation;
  const mockForward = jest.fn();

  afterEach(() => {
    mockForward.mockClear();
  });
  test('it should retry only if network status code is 503', () => {
    reTryOneTimeOnErrorHandler({
      networkError: mockNetworkError,
      operation: mockOperation,
      forward: mockForward,
    });
    expect(mockForward).toBeCalledWith(mockOperation);
  });

  test('it should not retry if other error happens', () => {
    reTryOneTimeOnErrorHandler({
      networkError: { ...mockNetworkError, statusCode: 500 },
      operation: mockOperation,
      forward: mockForward,
    });
    expect(mockForward).not.toBeCalled();
  });
});

describe('reTryOneTimeOnErrorLink', () => {
  test('onError should be called with reTryOneTimeOnErrorHandler', () => {
    expect(onError).toHaveBeenCalledWith(reTryOneTimeOnErrorHandler);
  });
});
