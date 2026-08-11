/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  prepareIncident,
  addServiceMessageToError,
  createServiceNowApiError,
  isServiceNowApiError,
  getPushedDate,
  throwIfSubActionIsNotSupported,
  getAxiosInstance,
  throwIfAdditionalFieldsNotSupported,
} from './utils';
import type { ResponseError } from './types';
import { ServiceNowApiError } from './types';
import { connectorTokenClientMock } from '@kbn/actions-plugin/server/lib/connector_token_client.mock';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { getOAuthJwtAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_jwt_access_token';
import { getBasicAuthHeader } from '@kbn/actions-plugin/server';
import { TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';

jest.mock('@kbn/actions-plugin/server/lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));

jest.mock('axios', () => ({
  create: jest.fn(),
  AxiosHeaders: jest.requireActual('axios').AxiosHeaders,
  AxiosError: jest.requireActual('axios').AxiosError,
}));
const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = {
  interceptors: {
    request: { eject: jest.fn(), use: jest.fn() },
    response: { eject: jest.fn(), use: jest.fn() },
  },
};

const connectorTokenClient = connectorTokenClientMock.create();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
/**
 * The purpose of this test is to
 * prevent developers from accidentally
 * change important configuration values
 * such as the scope or the import set table
 * of our ServiceNow application
 */
describe('utils', () => {
  describe('prepareIncident', () => {
    test('it prepares the incident correctly when useOldApi=false', async () => {
      const incident = { short_description: 'title', description: 'desc' };
      const newIncident = prepareIncident(false, incident);
      expect(newIncident).toEqual({ u_short_description: 'title', u_description: 'desc' });
    });

    test('it prepares the incident correctly when useOldApi=true', async () => {
      const incident = { short_description: 'title', description: 'desc' };
      const newIncident = prepareIncident(true, incident);
      expect(newIncident).toEqual(incident);
    });

    test('does not prefix additional fields with u_', async () => {
      const incident = {
        short_description: 'title',
        description: 'desc',
        additional_fields: { foo: 'test' },
      };

      const newIncident = prepareIncident(false, incident);
      expect(newIncident).toEqual({
        u_short_description: 'title',
        u_description: 'desc',
        foo: 'test',
      });
    });

    test('strips out additional fields if it is a deprecated connector', async () => {
      const incident = {
        short_description: 'title',
        description: 'desc',
        additional_fields: { foo: 'test' },
      };

      const newIncident = prepareIncident(true, incident);
      expect(newIncident).toEqual({ short_description: 'title', description: 'desc' });
    });

    test('does not overrides base fields', async () => {
      const incident = {
        short_description: 'title',
        description: 'desc',
        additional_fields: { u_short_description: 'foo' },
      };

      const newIncident = prepareIncident(false, incident);
      expect(newIncident).toEqual({
        u_short_description: 'title',
        u_description: 'desc',
      });
    });
  });

  describe('createServiceError', () => {
    describe('Table API errors', () => {
      test('it creates an error with response correctly', async () => {
        const axiosError = {
          message: 'An error occurred',
          response: { data: { error: { message: 'Denied', detail: 'no access' } } },
        } as ResponseError;

        expect(addServiceMessageToError(axiosError, 'Unable to do action').message).toBe(
          '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: Denied: no access'
        );
      });

      test('it creates an error correctly when the ServiceNow error is null', async () => {
        const axiosError = {
          message: 'An error occurred',
          response: { data: { error: null } },
        } as ResponseError;

        expect(addServiceMessageToError(axiosError, 'Unable to do action').message).toBe(
          '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: unknown: no error in error response'
        );
      });
    });
    describe('OAuth errors', () => {
      test('it extracts error and error_description from JSON in error message', async () => {
        const error = new Error('{"error":"invalid_grant","error_description":"User not found"}');
        // @ts-expect-error
        expect(addServiceMessageToError(error, 'Unable to do action').message).toBe(
          '[Action][ServiceNow]: Unable to do action. Error: invalid_grant Reason: User not found'
        );
      });

      test('it handles OAuth error without error_description', async () => {
        const error = new Error('{"error":"invalid_grant"}');
        // @ts-expect-error
        expect(addServiceMessageToError(error, 'Unable to do action').message).toBe(
          '[Action][ServiceNow]: Unable to do action. Error: invalid_grant'
        );
      });
    });
  });

  describe('context suffix', () => {
    test('appends status, method, and endpoint when context is provided', () => {
      const axiosError = {
        message: 'An error occurred',
        response: { status: 403, data: { error: { message: 'Denied', detail: 'no access' } } },
      } as ResponseError;

      expect(
        addServiceMessageToError(axiosError, 'Unable to do action', {
          endpoint: 'table',
          method: 'get',
        }).message
      ).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: Denied: no access [status=403] [method=get] [endpoint=table]'
      );
    });

    test('omits method when not provided', () => {
      const axiosError = {
        message: 'Boom',
        response: { status: 500, data: { error: { message: 'Boom', detail: '' } } },
      } as ResponseError;

      expect(
        addServiceMessageToError(axiosError, 'Unable to do action', { endpoint: 'table' }).message
      ).toMatch(/\[status=500\] \[endpoint=table\]$/);
    });

    test('uses ServiceNowApiError.status when error.response is absent', () => {
      const err = createServiceNowApiError('forced', { status: 200, body: {} });

      expect(
        addServiceMessageToError(err as unknown as ResponseError, 'Unable to do action', {
          endpoint: 'import_set',
          method: 'post',
        }).message
      ).toContain('[status=200] [method=post] [endpoint=import_set]');
    });

    test('falls back to error.code when no status is available', () => {
      const err = Object.assign(new Error('Unsupported protocol foo:'), {
        isAxiosError: true as const,
        code: 'ERR_BAD_REQUEST',
      });

      expect(
        addServiceMessageToError(err as unknown as ResponseError, 'Unable to do action', {
          endpoint: 'table',
          method: 'post',
        }).message
      ).toContain('[status=ERR_BAD_REQUEST]');
    });

    test('falls back to "none" when no signal is available', () => {
      const err = new Error('something broke') as unknown as ResponseError;

      expect(
        addServiceMessageToError(err, 'Unable to do action', { endpoint: 'other' }).message
      ).toContain('[status=none] [endpoint=other]');
    });

    test('does not append suffix when context is omitted (backwards compatible)', () => {
      const axiosError = {
        message: 'An error occurred',
        response: { status: 403, data: { error: { message: 'Denied' } } },
      } as ResponseError;

      expect(addServiceMessageToError(axiosError, 'Unable to do action').message).not.toMatch(
        /\[status=/
      );
    });
  });

  describe('createServiceNowApiError', () => {
    test('builds an error with status and body', () => {
      const err = createServiceNowApiError('boom', { status: 200, body: { foo: 1 } });
      expect(err.message).toBe('boom');
      expect(err.status).toBe(200);
      expect(err.body).toEqual({ foo: 1 });
    });

    test('is tagged as a USER task error', () => {
      const err = createServiceNowApiError('boom', { status: 200 });
      expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
    });

    test('isServiceNowApiError returns true for it', () => {
      const err = createServiceNowApiError('boom', { status: 200 });
      expect(isServiceNowApiError(err)).toBe(true);
      expect(err).toBeInstanceOf(ServiceNowApiError);
    });

    test('isServiceNowApiError returns false for plain Error', () => {
      expect(isServiceNowApiError(new Error('x'))).toBe(false);
    });
  });

  describe('maxContentLength classification', () => {
    test('tags axios maxContentLength errors as USER', () => {
      const err = Object.assign(new Error('maxContentLength size of 1024 exceeded'), {
        isAxiosError: true as const,
        code: 'ERR_BAD_RESPONSE',
      });

      addServiceMessageToError(err as unknown as ResponseError, 'Unable to create incident', {
        endpoint: 'import_set',
        method: 'post',
      });

      expect(getErrorSource(err as unknown as Error)).toBe(TaskErrorSource.USER);
    });

    test('tags axios maxContentLength errors as USER even when response metadata is present', () => {
      const err = Object.assign(new Error('maxContentLength size of 20971520 exceeded'), {
        isAxiosError: true as const,
        code: 'ERR_BAD_RESPONSE',
        response: { status: 200, headers: { 'content-length': '104857600' } },
      });

      addServiceMessageToError(err as unknown as ResponseError, 'Unable to create incident', {
        endpoint: 'import_set',
        method: 'post',
      });

      expect(getErrorSource(err as unknown as Error)).toBe(TaskErrorSource.USER);
    });

    test('does not tag a plain HTTP 4xx as USER via this path (response present)', () => {
      const err = Object.assign(new Error('Request failed'), {
        isAxiosError: true as const,
        code: 'ERR_BAD_REQUEST',
        response: { status: 413, data: {} },
      });

      addServiceMessageToError(err as unknown as ResponseError, 'Unable to create incident', {
        endpoint: 'table',
        method: 'post',
      });

      expect(getErrorSource(err as unknown as Error)).toBeUndefined();
    });

    test('does not tag a generic network error as USER', () => {
      const err = Object.assign(new Error('connect ECONNREFUSED'), {
        isAxiosError: true as const,
        code: 'ECONNREFUSED',
      });

      addServiceMessageToError(err as unknown as ResponseError, 'Unable to create incident', {
        endpoint: 'table',
        method: 'post',
      });

      expect(getErrorSource(err as unknown as Error)).toBeUndefined();
    });

    test('does not tag a plain Error as USER even if message mentions maxContentLength', () => {
      const err = new Error('maxContentLength was set somewhere');

      addServiceMessageToError(err as unknown as ResponseError, 'Unable to create incident', {
        endpoint: 'table',
        method: 'post',
      });

      expect(getErrorSource(err)).toBeUndefined();
    });
  });

  describe('getPushedDate', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2021-10-04 11:15:06 GMT'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('it formats the date correctly if timestamp is provided', async () => {
      expect(getPushedDate('2021-10-04 11:15:06')).toBe('2021-10-04T11:15:06.000Z');
    });

    test('it formats the date correctly if timestamp is not provided', async () => {
      expect(getPushedDate()).toBe('2021-10-04T11:15:06.000Z');
    });
  });

  describe('throwIfSubActionIsNotSupported', () => {
    const api = { pushToService: 'whatever' };

    test('it throws correctly if the subAction is not supported', async () => {
      expect.assertions(1);

      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'addEvent',
          supportedSubActions: ['getChoices'],
          logger,
        })
      ).toThrow('[Action][ExternalService] Unsupported subAction type addEvent');
    });

    test('it throws correctly if the subAction is not implemented', async () => {
      expect.assertions(1);

      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'pushToService',
          supportedSubActions: ['getChoices'],
          logger,
        })
      ).toThrow('[Action][ExternalService] subAction pushToService not implemented.');
    });

    test('it does not throw if the sub action is supported and implemented', async () => {
      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'pushToService',
          supportedSubActions: ['pushToService'],
          logger,
        })
      ).not.toThrow();
    });
  });

  describe('getAxiosInstance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
    });

    test('creates axios instance with basic auth when isOAuth is false and username and password are defined', () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: false,
            clientId: null,
            jwtKeyId: null,
            userIdentifierValue: null,
          },
          secrets: {
            clientSecret: null,
            privateKey: null,
            privateKeyPassword: null,
            username: 'username',
            password: 'password',
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });

      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith({
        headers: getBasicAuthHeader({ username: 'username', password: 'password' }),
      });
    });

    test('creates axios instance with interceptor when isOAuth is true and OAuth fields are defined', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });

      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce('Bearer tokentokentoken');

      const mockRequestCallback = (axiosInstanceMock.interceptors.request.use as jest.Mock).mock
        .calls[0][0];
      expect(await mockRequestCallback({ headers: {} })).toEqual({
        headers: new axios.AxiosHeaders({ Authorization: 'Bearer tokentokentoken' }),
      });

      expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalledWith({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          },
        },
        tokenUrl: 'https://dev23432523.service-now.com/oauth_token.do',
        connectorTokenClient,
      });
    });

    test('throws expected error if getOAuthJwtAccessToken returns null access token', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });
      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce(null);

      const mockRequestCallback = (axiosInstanceMock.interceptors.request.use as jest.Mock).mock
        .calls[0][0];

      await expect(() =>
        mockRequestCallback({ headers: {} })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to retrieve access token for connectorId: 123"`
      );

      expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalledWith({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          },
        },
        tokenUrl: 'https://dev23432523.service-now.com/oauth_token.do',
        connectorTokenClient,
      });
    });

    test('deletes saved access tokens if 4xx response received', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });
      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(axiosInstanceMock.interceptors.response.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce('Bearer tokentokentoken');

      const mockResponseCallback = (axiosInstanceMock.interceptors.response.use as jest.Mock).mock
        .calls[0][1];

      const errorResponse = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            error: {
              message: 'Insufficient rights to query records',
              detail: 'Field(s) present in the query do not have permission to be read',
            },
            status: 'failure',
          },
        },
      };

      await expect(() => mockResponseCallback(errorResponse)).rejects.toEqual(errorResponse);

      expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith({
        connectorId: '123',
      });
    });

    test('does not delete saved access token if not 4xx error response received', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });
      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(axiosInstanceMock.interceptors.response.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce('Bearer tokentokentoken');

      const mockResponseCallback = (axiosInstanceMock.interceptors.response.use as jest.Mock).mock
        .calls[0][1];

      const errorResponse = {
        response: {
          status: 500,
          statusText: 'Server error',
        },
      };

      await expect(() => mockResponseCallback(errorResponse)).rejects.toEqual(errorResponse);

      expect(connectorTokenClient.deleteConnectorTokens).not.toHaveBeenCalled();
    });
  });

  describe('throwIfAdditionalFieldsNotSupported', () => {
    it('throws if the connector is deprecated and it sets additional_fields', async () => {
      expect.assertions(1);

      expect(() => throwIfAdditionalFieldsNotSupported(true, { additional_fields: {} })).toThrow(
        'ServiceNow additional fields are not supported for deprecated connectors.'
      );
    });

    it('does not throw if the connector is deprecated and it does not set additional_fields', async () => {
      expect(() => throwIfAdditionalFieldsNotSupported(true, {})).not.toThrow();
    });

    it('does not throw if the connector is not and it set additional_fields', async () => {
      expect(() =>
        throwIfAdditionalFieldsNotSupported(false, { additional_fields: {} })
      ).not.toThrow();
    });

    it('does not throw if the connector is not and it does not set additional_fields', async () => {
      expect(() => throwIfAdditionalFieldsNotSupported(false, {})).not.toThrow();
    });
  });
});
