/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alert, AlertType } from '../../types';
import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import {
  createAlert,
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  loadAlerts,
  loadAlertTypes,
  muteAlerts,
  unmuteAlerts,
  updateAlert,
} from './alert_api';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadAlertTypes', () => {
  test('should call get alert types API', async () => {
    const resolvedValue: AlertType[] = [
      {
        id: 'test',
        name: 'Test',
      },
    ];
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alert/types",
      ]
    `);
  });
});

describe('loadAlerts', () => {
  test('should call find API with base parameters', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({ http, page: { index: 0, size: 10 } });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alert/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": undefined,
            "search_fields": undefined,
          },
        },
      ]
    `);
  });

  test('should call find API with searchText', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({ http, searchText: 'apples', page: { index: 0, size: 10 } });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "/api/alert/_find",
      Object {
        "query": Object {
          "default_search_operator": "AND",
          "filter": undefined,
          "page": 1,
          "per_page": 10,
          "search": "apples",
          "search_fields": "[\\"name\\",\\"tags\\"]",
        },
      },
    ]
    `);
  });

  test('should call find API with actionTypesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      searchText: 'foo',
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "/api/alert/_find",
      Object {
        "query": Object {
          "default_search_operator": "AND",
          "filter": undefined,
          "page": 1,
          "per_page": 10,
          "search": "foo",
          "search_fields": "[\\"name\\",\\"tags\\"]",
        },
      },
    ]
    `);
  });

  test('should call find API with typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "/api/alert/_find",
      Object {
        "query": Object {
          "default_search_operator": "AND",
          "filter": "alert.attributes.alertTypeId:(foo or bar)",
          "page": 1,
          "per_page": 10,
          "search": undefined,
          "search_fields": undefined,
        },
      },
    ]
    `);
  });

  test('should call find API with actionTypesFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      searchText: 'baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "/api/alert/_find",
      Object {
        "query": Object {
          "default_search_operator": "AND",
          "filter": "alert.attributes.alertTypeId:(foo or bar)",
          "page": 1,
          "per_page": 10,
          "search": "baz",
          "search_fields": "[\\"name\\",\\"tags\\"]",
        },
      },
    ]
    `);
  });

  test('should call find API with searchText and tagsFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      searchText: 'apples, foo, baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "/api/alert/_find",
      Object {
        "query": Object {
          "default_search_operator": "AND",
          "filter": "alert.attributes.alertTypeId:(foo or bar)",
          "page": 1,
          "per_page": 10,
          "search": "apples, foo, baz",
          "search_fields": "[\\"name\\",\\"tags\\"]",
        },
      },
    ]
    `);
  });
});

describe('deleteAlerts', () => {
  test('should call delete API for each alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await deleteAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.delete.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alert/1",
        ],
        Array [
          "/api/alert/2",
        ],
        Array [
          "/api/alert/3",
        ],
      ]
    `);
  });
});

describe('createAlert', () => {
  test('should call create alert API', async () => {
    const alertToCreate = {
      name: 'test',
      tags: ['foo'],
      enabled: true,
      alertTypeId: 'test',
      interval: '1m',
      actions: [],
      params: {},
      throttle: null,
    };
    const resolvedValue: Alert = {
      ...alertToCreate,
      id: '123',
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await createAlert({ http, alert: alertToCreate });
    expect(result).toEqual(resolvedValue);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alert",
        Object {
          "body": "{\\"name\\":\\"test\\",\\"tags\\":[\\"foo\\"],\\"enabled\\":true,\\"alertTypeId\\":\\"test\\",\\"interval\\":\\"1m\\",\\"actions\\":[],\\"params\\":{},\\"throttle\\":null}",
        },
      ]
    `);
  });
});

describe('updateAlert', () => {
  test('should call alert update API', async () => {
    const alertToUpdate = {
      throttle: '1m',
      name: 'test',
      tags: ['foo'],
      interval: '1m',
      params: {},
      actions: [],
    };
    const resolvedValue: Alert = {
      ...alertToUpdate,
      id: '123',
      enabled: true,
      alertTypeId: 'test',
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
    };
    http.put.mockResolvedValueOnce(resolvedValue);

    const result = await updateAlert({ http, id: '123', alert: alertToUpdate });
    expect(result).toEqual(resolvedValue);
    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alert/123",
        Object {
          "body": "{\\"throttle\\":\\"1m\\",\\"name\\":\\"test\\",\\"tags\\":[\\"foo\\"],\\"interval\\":\\"1m\\",\\"params\\":{},\\"actions\\":[]}",
        },
      ]
    `);
  });
});

describe('enableAlerts', () => {
  test('should call enable alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await enableAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alert/1/_enable",
        ],
        Array [
          "/api/alert/2/_enable",
        ],
        Array [
          "/api/alert/3/_enable",
        ],
      ]
    `);
  });
});

describe('disableAlerts', () => {
  test('should call disable alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await disableAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alert/1/_disable",
        ],
        Array [
          "/api/alert/2/_disable",
        ],
        Array [
          "/api/alert/3/_disable",
        ],
      ]
    `);
  });
});

describe('muteAlerts', () => {
  test('should call mute alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await muteAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alert/1/_mute_all",
        ],
        Array [
          "/api/alert/2/_mute_all",
        ],
        Array [
          "/api/alert/3/_mute_all",
        ],
      ]
    `);
  });
});

describe('unmuteAlerts', () => {
  test('should call unmute alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await unmuteAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alert/1/_unmute_all",
        ],
        Array [
          "/api/alert/2/_unmute_all",
        ],
        Array [
          "/api/alert/3/_unmute_all",
        ],
      ]
    `);
  });
});
