/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionConnector, ActionConnectorWithoutId, ActionType } from '../../types';
import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import {
  createActionConnector,
  deleteActions,
  loadActionTypes,
  loadAllActions,
  updateActionConnector,
} from './action_connector_api';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadActionTypes', () => {
  test('should call get types API', async () => {
    const resolvedValue: ActionType[] = [
      {
        id: 'test',
        name: 'Test',
      },
    ];
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadActionTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/action/types",
      ]
    `);
  });
});

describe('loadAllActions', () => {
  test('should call find actions API', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAllActions({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/action/_find",
        Object {
          "query": Object {
            "per_page": 10000,
          },
        },
      ]
    `);
  });
});

describe('createActionConnector', () => {
  test('should call create action API', async () => {
    const connector: ActionConnectorWithoutId = {
      actionTypeId: 'test',
      name: 'My test',
      config: {},
      secrets: {},
    };
    const resolvedValue: ActionConnector = { ...connector, id: '123' };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await createActionConnector({ http, connector });
    expect(result).toEqual(resolvedValue);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/action",
        Object {
          "body": "{\\"actionTypeId\\":\\"test\\",\\"name\\":\\"My test\\",\\"config\\":{},\\"secrets\\":{}}",
        },
      ]
    `);
  });
});

describe('updateActionConnector', () => {
  test('should call the update API', async () => {
    const id = '123';
    const connector: ActionConnectorWithoutId = {
      actionTypeId: 'test',
      name: 'My test',
      config: {},
      secrets: {},
    };
    const resolvedValue = { ...connector, id };
    http.put.mockResolvedValueOnce(resolvedValue);

    const result = await updateActionConnector({ http, connector, id });
    expect(result).toEqual(resolvedValue);
    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/action/123",
        Object {
          "body": "{\\"name\\":\\"My test\\",\\"config\\":{},\\"secrets\\":{}}",
        },
      ]
    `);
  });
});

describe('deleteActions', () => {
  test('should call delete API per action', async () => {
    const ids = ['1', '2', '3'];

    const result = await deleteActions({ ids, http });
    expect(result).toEqual({ errors: [], successes: [undefined, undefined, undefined] });
    expect(http.delete.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/action/1",
        ],
        Array [
          "/api/action/2",
        ],
        Array [
          "/api/action/3",
        ],
      ]
    `);
  });
});
