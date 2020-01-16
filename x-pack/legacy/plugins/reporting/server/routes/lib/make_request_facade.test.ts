/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { makeRequestFacade } from './make_request_facade';

describe('makeRequestFacade', () => {
  test('creates a default object', () => {
    const originalRequest = ({
      getBasePath: () => 'basebase',
      params: {
        param1: 123,
      },
      payload: {
        payload1: 123,
      },
      headers: {
        user: 123,
      },
    } as unknown) as Legacy.Request;

    expect(makeRequestFacade(originalRequest)).toMatchInlineSnapshot(`
      Object {
        "getBasePath": [Function],
        "getRawRequest": [Function],
        "getSavedObjectsClient": undefined,
        "headers": Object {
          "user": 123,
        },
        "params": Object {
          "param1": 123,
        },
        "payload": Object {
          "payload1": 123,
        },
        "pre": undefined,
        "query": undefined,
        "route": undefined,
      }
    `);
  });

  test('getRawRequest', () => {
    const originalRequest = ({
      getBasePath: () => 'basebase',
      params: {
        param1: 123,
      },
      payload: {
        payload1: 123,
      },
      headers: {
        user: 123,
      },
    } as unknown) as Legacy.Request;

    expect(makeRequestFacade(originalRequest).getRawRequest()).toBe(originalRequest);
  });
});
