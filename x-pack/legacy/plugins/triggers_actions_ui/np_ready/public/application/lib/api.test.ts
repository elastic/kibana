/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionConnector,
  ActionConnectorWithoutId,
  ActionType,
  Alert,
  AlertType,
} from '../../types';
import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import {
  createAlert,
  createActionConnector,
  deleteActions,
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  loadActionTypes,
  loadAlerts,
  loadAlertTypes,
  loadAllActions,
  muteAlerts,
  unmuteAlerts,
  updateActionConnector,
  updateAlert,
} from './api';

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
      description: 'My test',
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
          "body": "{\\"actionTypeId\\":\\"test\\",\\"description\\":\\"My test\\",\\"config\\":{},\\"secrets\\":{}}",
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
      description: 'My test',
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
          "body": "{\\"description\\":\\"My test\\",\\"config\\":{},\\"secrets\\":{}}",
        },
      ]
    `);
  });
});

describe('deleteActions', () => {
  test('should call delete API per action', async () => {
    const ids = ['1', '2', '3'];

    const result = await deleteActions({ ids, http });
    expect(result).toEqual(undefined);
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
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": "apples",
            "search_fields": "name",
          },
        },
      ]
    `);
  });

  test('should call find API with tagsFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      tagsFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alert/_find",
        Object {
          "query": Object {
            "filter": "alert.attributes.tags:(foo and bar)",
            "page": 1,
            "per_page": 10,
            "search": undefined,
            "search_fields": undefined,
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

  test('should call find API with tagsFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      tagsFilter: ['foo', 'baz'],
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alert/_find",
        Object {
          "query": Object {
            "filter": "alert.attributes.tags:(foo and baz) and alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": undefined,
            "search_fields": undefined,
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
      searchText: 'apples',
      tagsFilter: ['foo', 'baz'],
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alert/_find",
        Object {
          "query": Object {
            "filter": "alert.attributes.tags:(foo and baz) and alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": "apples",
            "search_fields": "name",
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
