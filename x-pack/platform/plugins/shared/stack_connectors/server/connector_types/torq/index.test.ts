/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

import axios from 'axios';
import { ActionTypeConfigType, getActionType, TorqActionType } from '.';

import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import { validateConfig, validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { Services } from '@kbn/actions-plugin/server/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggerMock } from '@kbn/logging-mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

const requestMock = utils.request as jest.Mock;

axios.create = jest.fn(() => axios);

const services: Services = actionsMock.createServices();

let actionType: TorqActionType;
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;
let connectorUsageCollector: ConnectorUsageCollector;

beforeAll(() => {
  actionType = getActionType();
  configurationUtilities = actionsConfigMock.create();
  connectorUsageCollector = new ConnectorUsageCollector({
    logger: mockedLogger,
    connectorId: 'test-connector-id',
  });
});

describe('actionType', () => {
  test('exposes the action as `torq` on its Id and Name', () => {
    expect(actionType.id).toEqual('.torq');
    expect(actionType.name).toEqual('Torq');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, string> = {
      token: 'jfi2fji3ofeaiw34if',
    };
    expect(validateSecrets(actionType, secrets, { configurationUtilities })).toEqual(secrets);
  });

  test('fails when secret token is not provided', () => {
    expect(() => {
      validateSecrets(actionType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [token]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('config validation', () => {
  const defaultValues: Record<string, string | null> = {};

  test('config validation passes with an appropriate endpoint', () => {
    const config: Record<string, string | boolean> = {
      webhookIntegrationUrl: 'https://hooks.torq.io/v1/test',
    };
    expect(validateConfig(actionType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  const errorCases: Array<{ name: string; url: string; errorMsg: string }> = [
    {
      name: 'invalid URL leads to error',
      url: 'iamnotavalidurl',
      errorMsg: `"error validating action type config: error configuring send to Torq action: unable to parse url: TypeError: Invalid URL: iamnotavalidurl"`,
    },
    {
      name: 'incomplete URL leads to error',
      url: 'example.com/do-something',
      errorMsg: `"error validating action type config: error configuring send to Torq action: unable to parse url: TypeError: Invalid URL: example.com/do-something"`,
    },
    {
      name: 'fails when URL is not a Torq webhook endpoint',
      url: 'http://mylisteningserver:9200/endpoint',
      errorMsg: `"error validating action type config: error configuring send to Torq action: url must begin with https://hooks.torq.io"`,
    },
  ];
  errorCases.forEach(({ name, url, errorMsg }) => {
    test(name, () => {
      const config: Record<string, string> = {
        webhookIntegrationUrl: url,
      };
      expect(() => {
        validateConfig(actionType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(errorMsg);
    });
  });

  test("config validation returns an error if the specified URL isn't added to allowedHosts", () => {
    actionType = getActionType();

    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (_: string) => {
        throw new Error(`target url is not present in allowedHosts`);
      },
    };

    // any for testing
    const config: Record<string, string> = {
      webhookIntegrationUrl: 'http://mylisteningserver.com:9200/endpoint',
    };

    expect(() => {
      validateConfig(actionType, config, { configurationUtilities: configUtils });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring send to Torq action: target url is not present in allowedHosts"`
    );
  });
});

describe('params validation', () => {
  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, string> = {
      body: '{"message": "Hello"}',
    };
    expect(validateParams(actionType, params, { configurationUtilities })).toEqual({
      ...params,
    });
  });
});

describe('execute Torq action', () => {
  beforeAll(() => {
    requestMock.mockReset();
    actionType = getActionType();
  });

  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      status: 200,
      statusText: '',
      data: '',
      headers: [],
      config: {},
    });
  });

  test('execute with token happy flow', async () => {
    const config: ActionTypeConfigType = {
      webhookIntegrationUrl: 'https://hooks.torq.io/v1/test',
    };
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { token: '1234' },
      params: { body: '{"msg": "some data"}' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchSnapshot({
      axios: expect.any(Function),
      connectorUsageCollector: {
        usage: {
          requestBodyBytes: 0,
        },
      },
      data: {
        msg: 'some data',
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Torq-Token': '1234',
      },
      logger: expect.any(Object),
      method: 'post',
      url: 'https://hooks.torq.io/v1/test',
      validateStatus: expect.any(Function),
    });
  });

  test('renders parameter templates as expected', async () => {
    const templatedObject = `{"material": "rubber", "kind": "band"}`;

    expect(actionType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      body: '{"x": {{obj}}, "y": "{{scalar}}", "z": "{{scalar_with_json_chars}}"}',
    };
    const variables = {
      obj: templatedObject,
      scalar: '1970',
      scalar_with_json_chars: 'noinjection", "here": "',
    };
    const params = actionType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables
    );
    expect(params.body).toBe(
      `{"x": ${templatedObject}, "y": "${variables.scalar}", "z": "${variables.scalar_with_json_chars}"}`
    );
  });
});
