/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/post_servicenow', () => ({
  postServiceNow: jest.fn(),
}));

import { getActionType } from './servicenow';
import { ActionType, Services, ActionTypeExecutorOptions } from '../types';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { postServiceNow } from './lib/post_servicenow';
import { createActionTypeRegistry } from './index.test';
import { configUtilsMock } from '../actions_config.mock';

const postServiceNowMock = postServiceNow as jest.Mock;

const ACTION_TYPE_ID = '.servicenow';

const services: Services = {
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: savedObjectsClientMock.create(),
};

let actionType: ActionType;

beforeAll(() => {
  const { actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
});

describe('get()', () => {
  test('should return correct action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('servicenow');
  });
});

describe('validateConfig()', () => {
  test('should validate and pass when config is valid', () => {
    expect(validateConfig(actionType, { apiUrl: 'bar' })).toEqual({ apiUrl: 'bar' });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, { shouldNotBeHere: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [apiUrl]: expected value of type [string] but got [undefined]"`
    );
  });

  test('should validate and pass when the servicenow url is whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: url => {
          expect(url).toEqual('https://events.servicenow.com/v2/enqueue');
        },
      },
    });

    expect(
      validateConfig(actionType, { apiUrl: 'https://events.servicenow.com/v2/enqueue' })
    ).toEqual({ apiUrl: 'https://events.servicenow.com/v2/enqueue' });
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: _ => {
          throw new Error(`target url is not whitelisted`);
        },
      },
    });

    expect(() => {
      validateConfig(actionType, { apiUrl: 'https://events.servicenow.com/v2/enqueue' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring servicenow action: target url is not whitelisted"`
    );
  });
});

describe('validateSecrets()', () => {
  test('should validate and pass when secrets is valid', () => {
    expect(
      validateSecrets(actionType, {
        password: 'secret-password',
        username: 'secret-username',
      })
    ).toEqual({
      password: 'secret-password',
      username: 'secret-username',
    });
  });

  test('should validate and throw error when secrets is invalid', () => {
    expect(() => {
      validateSecrets(actionType, { username: false });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [password]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(actionType, { username: false, password: 'hello' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [username]: expected value of type [string] but got [boolean]"`
    );
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    const params = {
      comments: 'comments',
      short_description: 'a short_description',
    };
    expect(validateParams(actionType, params)).toEqual(params);
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, { eventAction: 'ackynollage' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [comments]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('execute()', () => {
  beforeEach(() => {
    postServiceNowMock.mockReset();
  });

  test('should succeed with minimal valid params', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = {};
    const params = {};

    postServiceNowMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    const { apiUrl, data, headers } = postServiceNowMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "https://events.servicenow.com/v2/enqueue",
        "data": Object {
          "dedup_key": "action:some-action-id",
          "event_action": "trigger",
          "payload": Object {
            "severity": "info",
            "source": "Kibana Action some-action-id",
            "summary": "No summary provided.",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should succeed with maximal valid params for trigger', async () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const secrets = {
      password: 'secret-password',
      username: 'secret-username',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params = {
      comments: 'comments',
      short_description: 'short_description',
    };

    postServiceNowMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    const { apiUrl, data, headers } = postServiceNowMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "trigger",
          "payload": Object {
            "class": "the-class",
            "component": "the-component",
            "group": "the-group",
            "severity": "critical",
            "source": "the-source",
            "summary": "the summary",
            "timestamp": "1963-09-23T01:23:45.000Z",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should succeed with maximal valid params for acknowledge', async () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params = {
      eventAction: 'acknowledge',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: randoDate,
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postServiceNowMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    const { apiUrl, data, headers } = postServiceNowMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "acknowledge",
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should succeed with maximal valid params for resolve', async () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params = {
      eventAction: 'resolve',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: randoDate,
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postServiceNowMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    const { apiUrl, data, headers } = postServiceNowMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "resolve",
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should fail when postServiceNow throws', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = {};
    const params = {};

    postServiceNowMock.mockImplementation(() => {
      throw new Error('doing some testing');
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event",
        "serviceMessage": "doing some testing",
        "status": "error",
      }
    `);
  });

  test('should fail when postServiceNow returns 429', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = {};
    const params = {};

    postServiceNowMock.mockImplementation(() => {
      return { status: 429, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event: http status 429, retry later",
        "retry": true,
        "status": "error",
      }
    `);
  });

  test('should fail when postServiceNow returns 501', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = {};
    const params = {};

    postServiceNowMock.mockImplementation(() => {
      return { status: 501, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event: http status 501, retry later",
        "retry": true,
        "status": "error",
      }
    `);
  });

  test('should fail when postServiceNow returns 418', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = {};
    const params = {};

    postServiceNowMock.mockImplementation(() => {
      return { status: 418, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting servicenow event: unexpected status 418",
        "status": "error",
      }
    `);
  });
});
