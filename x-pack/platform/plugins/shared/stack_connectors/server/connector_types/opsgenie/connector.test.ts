/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { OpsgenieConnectorTypeId } from '../../../common';
import { OpsgenieConnector } from './connector';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

jest.mock('axios');

jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

const axiosMock = axios as jest.Mocked<typeof axios>;
const requestMock = utils.request as jest.Mock;

describe('OpsgenieConnector', () => {
  const axiosInstanceMock = jest.fn();

  let connector: OpsgenieConnector;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
  let logger: MockedLogger;
  let services: ReturnType<typeof actionsMock.createServices>;
  let connectorUsageCollector: ConnectorUsageCollector;

  const defaultCreateAlertExpect = {
    method: 'post',
    url: 'https://example.com/v2/alerts',
    headers: { Authorization: 'GenieKey 123', 'Content-Type': 'application/json' },
  };

  const createCloseAlertExpect = (alias: string) => ({
    method: 'post',
    url: `https://example.com/v2/alerts/${alias}/close?identifierType=alias`,
    headers: { Authorization: 'GenieKey 123', 'Content-Type': 'application/json' },
  });

  const ignoredRequestFields = {
    axios: expect.anything(),
    configurationUtilities: expect.anything(),
    logger: expect.anything(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    requestMock.mockReturnValue({ data: { took: 5, requestId: '123', result: 'ok' } });
    axiosMock.create.mockImplementation(() => {
      return axiosInstanceMock as unknown as AxiosInstance;
    });

    logger = loggingSystemMock.createLogger();
    services = actionsMock.createServices();
    mockedActionsConfig = actionsConfigMock.create();

    connector = new OpsgenieConnector({
      configurationUtilities: mockedActionsConfig,
      config: { apiUrl: 'https://example.com' },
      connector: { id: '1', type: OpsgenieConnectorTypeId },
      secrets: { apiKey: '123' },
      logger,
      services,
    });
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
  });

  it('calls request with the correct arguments for creating an alert', async () => {
    await connector.createAlert({ message: 'hello' }, connectorUsageCollector);

    expect(requestMock.mock.calls[0][0]).toEqual({
      data: { message: 'hello' },
      ...ignoredRequestFields,
      ...defaultCreateAlertExpect,
      connectorUsageCollector,
    });
  });

  it('calls request without modifying the alias when it is less than 512 characters when creating an alert', async () => {
    await connector.createAlert({ message: 'hello', alias: '111' }, connectorUsageCollector);

    expect(requestMock.mock.calls[0][0]).toEqual({
      ...ignoredRequestFields,
      ...defaultCreateAlertExpect,
      data: { message: 'hello', alias: '111' },
      connectorUsageCollector,
    });
  });

  it('calls request without modifying the alias when it is equal to 512 characters when creating an alert', async () => {
    const alias = 'a'.repeat(512);
    await connector.createAlert({ message: 'hello', alias }, connectorUsageCollector);

    expect(requestMock.mock.calls[0][0]).toEqual({
      ...ignoredRequestFields,
      ...defaultCreateAlertExpect,
      data: { message: 'hello', alias },
      connectorUsageCollector,
    });
  });

  it('calls request with the sha256 hash of the alias when it is greater than 512 characters when creating an alert', async () => {
    const alias = 'a'.repeat(513);

    const hasher = crypto.createHash('sha256');
    const sha256Hash = hasher.update(alias);

    await connector.createAlert({ message: 'hello', alias }, connectorUsageCollector);

    expect(requestMock.mock.calls[0][0]).toEqual({
      ...ignoredRequestFields,
      ...defaultCreateAlertExpect,
      data: { message: 'hello', alias: `sha-${sha256Hash.digest('hex')}` },
      connectorUsageCollector,
    });
  });

  it('calls request with the sha256 hash of the alias when it is greater than 512 characters when closing an alert', async () => {
    const alias = 'a'.repeat(513);

    const hasher = crypto.createHash('sha256');
    const sha256Hash = hasher.update(alias);

    await connector.closeAlert({ alias }, connectorUsageCollector);

    expect(requestMock.mock.calls[0][0]).toEqual({
      ...ignoredRequestFields,
      ...createCloseAlertExpect(`sha-${sha256Hash.digest('hex')}`),
      data: {},
      connectorUsageCollector,
    });
  });

  it('calls request with the correct arguments for closing an alert', async () => {
    await connector.closeAlert({ user: 'sam', alias: '111' }, connectorUsageCollector);

    expect(requestMock.mock.calls[0][0]).toEqual({
      ...ignoredRequestFields,
      ...createCloseAlertExpect('111'),
      data: { user: 'sam' },
      connectorUsageCollector,
    });
  });

  describe('getResponseErrorMessage', () => {
    it('returns an unknown error message', () => {
      // @ts-expect-error expects an axios error as the parameter
      expect(connector.getResponseErrorMessage({})).toMatchInlineSnapshot(`"unknown error"`);
    });

    it('returns the error.message', () => {
      // @ts-expect-error expects an axios error as the parameter
      expect(connector.getResponseErrorMessage({ message: 'a message' })).toMatchInlineSnapshot(
        `"a message"`
      );
    });

    it('returns the error.response.data.message', () => {
      expect(
        // @ts-expect-error expects an axios error as the parameter
        connector.getResponseErrorMessage({ response: { data: { message: 'a message' } } })
      ).toMatchInlineSnapshot(`"a message"`);
    });

    it('returns detailed message', () => {
      // @ts-expect-error expects an axios error as the parameter
      const error: AxiosError<FailureResponseType> = {
        response: {
          data: {
            errors: {
              message: 'message field had a problem',
            },
            message: 'toplevel message',
          },
        },
      };

      expect(connector.getResponseErrorMessage(error)).toMatchInlineSnapshot(
        `"toplevel message: {\\"message\\":\\"message field had a problem\\"}"`
      );
    });

    it('returns detailed message with multiple entires', () => {
      // @ts-expect-error expects an axios error as the parameter
      const error: AxiosError<FailureResponseType> = {
        response: {
          data: {
            errors: {
              message: 'message field had a problem',
              visibleTo: 'visibleTo field had a problem',
            },
            message: 'toplevel message',
          },
        },
      };

      expect(connector.getResponseErrorMessage(error)).toMatchInlineSnapshot(
        `"toplevel message: {\\"message\\":\\"message field had a problem\\",\\"visibleTo\\":\\"visibleTo field had a problem\\"}"`
      );
    });
  });
});
