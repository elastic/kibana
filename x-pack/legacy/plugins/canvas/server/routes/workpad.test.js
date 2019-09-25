/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from '@hapi/hapi';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
} from '../../common/lib/constants';
import { workpad } from './workpad';

const routePrefix = API_ROUTE_WORKPAD;
const routePrefixAssets = API_ROUTE_WORKPAD_ASSETS;
const routePrefixStructures = API_ROUTE_WORKPAD_STRUCTURES;

jest.mock('uuid/v4', () => jest.fn().mockReturnValue('123abc'));

describe(`${CANVAS_TYPE} API`, () => {
  const savedObjectsClient = {
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  afterEach(() => {
    savedObjectsClient.get.mockReset();
    savedObjectsClient.create.mockReset();
    savedObjectsClient.delete.mockReset();
    savedObjectsClient.find.mockReset();
  });

  // Mock toISOString function of all Date types
  global.Date = class Date extends global.Date {
    toISOString() {
      return '2019-02-12T21:01:22.479Z';
    }
  };

  // Setup mock server
  const mockServer = new Hapi.Server({ debug: false, port: 0 });
  mockServer.plugins = {
    elasticsearch: {
      getCluster: () => ({
        errors: {
          // formatResponse will fail without objects here
          '400': Error,
          '401': Error,
          '403': Error,
          '404': Error,
        },
      }),
    },
  };
  mockServer.ext('onRequest', (req, h) => {
    req.getSavedObjectsClient = () => savedObjectsClient;
    return h.continue;
  });
  workpad(mockServer);

  describe(`GET ${routePrefix}/{id}`, () => {
    test('returns successful response', async () => {
      const request = {
        method: 'GET',
        url: `${routePrefix}/123`,
      };

      savedObjectsClient.get.mockResolvedValueOnce({ id: '123', attributes: { foo: true } });

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "123",
}
`);
      expect(savedObjectsClient.get.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    "123",
  ],
]
`);
    });
  });

  describe(`POST ${routePrefix}`, () => {
    test('returns successful response without id in payload', async () => {
      const request = {
        method: 'POST',
        url: routePrefix,
        payload: {
          foo: true,
        },
      };

      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.create.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    Object {
      "@created": "2019-02-12T21:01:22.479Z",
      "@timestamp": "2019-02-12T21:01:22.479Z",
      "foo": true,
    },
    Object {
      "id": "workpad-123abc",
    },
  ],
]
`);
    });

    test('returns succesful response with id in payload', async () => {
      const request = {
        method: 'POST',
        url: routePrefix,
        payload: {
          id: '123',
          foo: true,
        },
      };

      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.create.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    Object {
      "@created": "2019-02-12T21:01:22.479Z",
      "@timestamp": "2019-02-12T21:01:22.479Z",
      "foo": true,
    },
    Object {
      "id": "123",
    },
  ],
]
`);
    });
  });

  describe(`PUT ${routePrefix}/{id}`, () => {
    test('formats successful response', async () => {
      const request = {
        method: 'PUT',
        url: `${routePrefix}/123`,
        payload: {
          id: '234',
          foo: true,
        },
      };

      savedObjectsClient.get.mockResolvedValueOnce({
        attributes: {
          '@created': new Date().toISOString(),
        },
      });
      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.get.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    "123",
  ],
]
`);
      expect(savedObjectsClient.create.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    Object {
      "@created": "2019-02-12T21:01:22.479Z",
      "@timestamp": "2019-02-12T21:01:22.479Z",
      "foo": true,
    },
    Object {
      "id": "123",
      "overwrite": true,
    },
  ],
]
`);
    });
  });

  describe(`DELETE ${routePrefix}/{id}`, () => {
    test('formats successful response', async () => {
      const request = {
        method: 'DELETE',
        url: `${routePrefix}/123`,
      };

      savedObjectsClient.delete.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.delete.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    "123",
  ],
]
`);
    });
  });

  it(`GET ${routePrefix}/find`, async () => {
    const request = {
      method: 'GET',
      url: `${routePrefix}/find?name=abc&page=2&perPage=10`,
    };

    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          attributes: {
            foo: true,
          },
        },
      ],
    });

    const { payload, statusCode } = await mockServer.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toMatchInlineSnapshot(`
Object {
  "workpads": Array [
    Object {
      "foo": true,
      "id": "1",
    },
  ],
}
`);
    expect(savedObjectsClient.find.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "fields": Array [
        "id",
        "name",
        "@created",
        "@timestamp",
      ],
      "page": "2",
      "perPage": "10",
      "search": "abc* | abc",
      "searchFields": Array [
        "name",
      ],
      "sortField": "@timestamp",
      "sortOrder": "desc",
      "type": "canvas-workpad",
    },
  ],
]
`);
  });

  describe(`PUT ${routePrefixAssets}/{id}`, () => {
    test('only updates assets', async () => {
      const request = {
        method: 'PUT',
        url: `${routePrefixAssets}/123`,
        payload: {
          'asset-123': {
            id: 'asset-123',
            '@created': '2019-02-14T00:00:00.000Z',
            type: 'dataurl',
            value: 'mockbase64data',
          },
          'asset-456': {
            id: 'asset-456',
            '@created': '2019-02-15T00:00:00.000Z',
            type: 'dataurl',
            value: 'mockbase64data',
          },
        },
      };

      // provide some existing workpad data to check that it's preserved
      savedObjectsClient.get.mockResolvedValueOnce({
        attributes: {
          '@created': new Date().toISOString(),
          name: 'fake workpad',
        },
      });
      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.get.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    "123",
  ],
]
`);
      expect(savedObjectsClient.create.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    Object {
      "@created": "2019-02-12T21:01:22.479Z",
      "@timestamp": "2019-02-12T21:01:22.479Z",
      "assets": Object {
        "asset-123": Object {
          "@created": "2019-02-14T00:00:00.000Z",
          "id": "asset-123",
          "type": "dataurl",
          "value": "mockbase64data",
        },
        "asset-456": Object {
          "@created": "2019-02-15T00:00:00.000Z",
          "id": "asset-456",
          "type": "dataurl",
          "value": "mockbase64data",
        },
      },
      "name": "fake workpad",
    },
    Object {
      "id": "123",
      "overwrite": true,
    },
  ],
]
`);
    });
  });

  describe(`PUT ${routePrefixStructures}/{id}`, () => {
    test('only updates workpad', async () => {
      const request = {
        method: 'PUT',
        url: `${routePrefixStructures}/123`,
        payload: {
          name: 'renamed workpad',
          css: '.canvasPage { color: LavenderBlush; }',
        },
      };

      // provide some existing asset data and a name to replace
      savedObjectsClient.get.mockResolvedValueOnce({
        attributes: {
          '@created': new Date().toISOString(),
          name: 'fake workpad',
          assets: {
            'asset-123': {
              id: 'asset-123',
              '@created': '2019-02-14T00:00:00.000Z',
              type: 'dataurl',
              value: 'mockbase64data',
            },
          },
        },
      });
      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.get.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    "123",
  ],
]
`);
      expect(savedObjectsClient.create.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "canvas-workpad",
    Object {
      "@created": "2019-02-12T21:01:22.479Z",
      "@timestamp": "2019-02-12T21:01:22.479Z",
      "assets": Object {
        "asset-123": Object {
          "@created": "2019-02-14T00:00:00.000Z",
          "id": "asset-123",
          "type": "dataurl",
          "value": "mockbase64data",
        },
      },
      "css": ".canvasPage { color: LavenderBlush; }",
      "name": "renamed workpad",
    },
    Object {
      "id": "123",
      "overwrite": true,
    },
  ],
]
`);
    });
  });
});
