/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { ActionTypeExecutorOptions } from '@kbn/actions-plugin/server/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type {
  ExecutorParams,
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
} from '@kbn/connector-schemas/jira';
import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';

import { getConnectorType } from '.';
import { api } from './api';

jest.mock('./api', () => ({
  api: {
    getFields: jest.fn(),
    handshake: jest.fn(),
    pushToService: jest.fn(),
    getIncident: jest.fn(),
    issueTypes: jest.fn(),
    fieldsByIssueType: jest.fn(),
    issues: jest.fn(),
    issue: jest.fn(),
  },
}));

const services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();
const configurationUtilities = actionsConfigMock.create();

const minimalAxiosRequestConfig = { headers: {} } as InternalAxiosRequestConfig;

const jiraAxios400Error = new AxiosError(
  'Request failed with status code 400',
  'ERR_BAD_REQUEST',
  minimalAxiosRequestConfig,
  undefined,
  {
    status: 400,
    statusText: 'Bad Request',
    data: {},
    headers: {},
    config: minimalAxiosRequestConfig,
  }
);

describe('Jira connector executor', () => {
  const config: JiraPublicConfigurationType = {
    apiUrl: 'https://coolsite.net/',
    projectKey: 'CK',
  };
  const secrets: JiraSecretConfigurationType = {
    apiToken: 'token',
    email: 'elastic@elastic.com',
  };
  let connectorUsageCollector: ConnectorUsageCollector;
  let connectorType: ReturnType<typeof getConnectorType>;

  beforeAll(() => {
    connectorType = getConnectorType();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger: mockedLogger,
      connectorId: 'test-connector-id',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('issueTypes sub-action returns ok when api resolves', async () => {
    const issueTypesData = [
      { id: '10006', name: 'Task' },
      { id: '10007', name: 'Bug' },
    ];
    (api.issueTypes as jest.Mock).mockResolvedValueOnce(issueTypesData);

    const actionId = 'some-action-id';
    const executorOptions = {
      actionId,
      config,
      secrets,
      params: {
        subAction: 'issueTypes',
        subActionParams: {},
      },
      services,
      logger: mockedLogger,
      configurationUtilities,
      connectorUsageCollector,
    } as unknown as ActionTypeExecutorOptions<
      JiraPublicConfigurationType,
      JiraSecretConfigurationType,
      ExecutorParams
    >;

    const result = await connectorType.executor(executorOptions);

    expect(result).toEqual({
      status: 'ok',
      data: issueTypesData,
      actionId,
    });
    expect(api.issueTypes).toHaveBeenCalledTimes(1);
    expect((api.issueTypes as jest.Mock).mock.calls[0][0]).toMatchObject({
      params: {},
    });
  });

  test('issueTypes sub-action maps Axios 400 to TaskErrorSource.USER', async () => {
    (api.issueTypes as jest.Mock).mockRejectedValueOnce(jiraAxios400Error);

    const executorOptions = {
      actionId: 'some-action-id',
      config,
      secrets,
      params: {
        subAction: 'issueTypes',
        subActionParams: {},
      },
      services,
      logger: mockedLogger,
      configurationUtilities,
      connectorUsageCollector,
    } as unknown as ActionTypeExecutorOptions<
      JiraPublicConfigurationType,
      JiraSecretConfigurationType,
      ExecutorParams
    >;

    let caught: unknown;
    try {
      await connectorType.executor(executorOptions);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    expect(getErrorSource(caught as Error)).toBe(TaskErrorSource.USER);
    expect(api.issueTypes).toHaveBeenCalledTimes(1);
  });
});
