/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { generateExecutorFunction } from './generate_executor_function';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { GetAxiosInstanceWithAuthFn } from '../get_axios_instance';

describe('generateExecutorFunction', () => {
  const connectorId = 'test-connector-id';

  let logger: MockedLogger;
  let mockGetAxiosInstanceWithAuth: jest.MockedFunction<GetAxiosInstanceWithAuthFn>;
  let mockAxiosInstance: object;
  let mockHandler: jest.Mock;

  const makeExecOptions = (params: Record<string, unknown>) =>
    ({
      actionId: connectorId,
      config: { url: 'https://example.com' },
      secrets: { token: 'secret' },
      params,
      logger,
      connectorTokenClient: undefined,
      globalAuthHeaders: undefined,
      // satisfies the type but unused by the function under test
      services: {} as never,
      configurationUtilities: {} as never,
      connectorUsageCollector: {} as never,
    } as Parameters<ReturnType<typeof generateExecutorFunction>>[0]);

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggingSystemMock.createLogger();
    mockAxiosInstance = { get: jest.fn() };
    mockGetAxiosInstanceWithAuth = jest.fn().mockResolvedValue(mockAxiosInstance);
    mockHandler = jest.fn().mockResolvedValue({ result: 'ok' });
  });

  const makeActions = (handler: jest.Mock = mockHandler): ConnectorSpec['actions'] => ({
    testAction: {
      isTool: true,
      input: {} as never,
      handler,
    },
  });

  describe('successful execution', () => {
    it('returns status ok with handler result as data', async () => {
      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const result = await executor(
        makeExecOptions({ subAction: 'testAction', subActionParams: { foo: 'bar' } })
      );

      expect(result).toEqual({ status: 'ok', data: { result: 'ok' }, actionId: connectorId });
    });

    it('passes subActionParams to the handler', async () => {
      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const subActionParams = { message: 'hello', count: 3 };
      await executor(makeExecOptions({ subAction: 'testAction', subActionParams }));

      expect(mockHandler).toHaveBeenCalledWith(expect.anything(), subActionParams);
    });

    it('passes config, secrets, and axios instance in the handler context', async () => {
      const config = { url: 'https://example.com' };
      const secrets = { token: 'secret' };

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const opts = makeExecOptions({ subAction: 'testAction', subActionParams: {} });
      await executor({ ...opts, config, secrets });

      expect(mockHandler).toHaveBeenCalledWith(
        { log: logger, client: mockAxiosInstance, config, secrets },
        {}
      );
    });

    it('returns empty object as data when handler returns null', async () => {
      mockHandler.mockResolvedValue(null);

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const result = await executor(
        makeExecOptions({ subAction: 'testAction', subActionParams: {} })
      );

      expect(result).toEqual({ status: 'ok', data: {}, actionId: connectorId });
    });

    it('returns empty object as data when handler returns undefined', async () => {
      mockHandler.mockResolvedValue(undefined);

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const result = await executor(
        makeExecOptions({ subAction: 'testAction', subActionParams: {} })
      );

      expect(result).toEqual({ status: 'ok', data: {}, actionId: connectorId });
    });

    it('calls getAxiosInstanceWithAuth with the correct options', async () => {
      const connectorTokenClient = {} as never;
      const globalAuthHeaders = { 'X-Custom': 'value' };

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      await executor({
        ...makeExecOptions({ subAction: 'testAction', subActionParams: {} }),
        connectorTokenClient,
        globalAuthHeaders,
      });

      expect(mockGetAxiosInstanceWithAuth).toHaveBeenCalledWith({
        connectorId,
        connectorTokenClient,
        additionalHeaders: globalAuthHeaders,
        secrets: { token: 'secret' },
      });
    });
  });

  describe('unrecognized subAction', () => {
    it('throws and logs an error for an unknown subAction', async () => {
      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      await expect(
        executor(makeExecOptions({ subAction: 'unknownAction', subActionParams: {} }))
      ).rejects.toThrow('[Action][ExternalService] Unsupported subAction type unknownAction.');

      expect(logger.error).toHaveBeenCalledWith(
        '[Action][ExternalService] Unsupported subAction type unknownAction.'
      );
    });

    it('does not call the handler when subAction is not registered', async () => {
      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      await expect(
        executor(makeExecOptions({ subAction: 'notRegistered', subActionParams: {} }))
      ).rejects.toThrow();

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('handler error handling', () => {
    it('returns status error with generic message when handler throws an Error', async () => {
      mockHandler.mockRejectedValue(new Error('handler failed'));

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const result = await executor(
        makeExecOptions({ subAction: 'testAction', subActionParams: {} })
      );

      expect(result).toEqual({
        status: 'error',
        message: 'error calling connector, unexpected error',
        actionId: connectorId,
      });
    });

    it('logs the error message when the handler throws', async () => {
      mockHandler.mockRejectedValue(new Error('handler failed'));

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      await executor(makeExecOptions({ subAction: 'testAction', subActionParams: {} }));

      expect(logger.error).toHaveBeenCalledWith(
        `error on ${connectorId} event: Error: handler failed`
      );
    });

    it('returns status error with generic message when handler throws a non-Error', async () => {
      mockHandler.mockRejectedValue('string error');

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const result = await executor(
        makeExecOptions({ subAction: 'testAction', subActionParams: {} })
      );

      expect(result).toEqual({
        status: 'error',
        message: 'error calling connector, unexpected error',
        actionId: connectorId,
      });
    });

    it('does not throw when handler fails — returns error result instead', async () => {
      mockHandler.mockRejectedValue(new Error('boom'));

      const executor = generateExecutorFunction({
        actions: makeActions(),
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      await expect(
        executor(makeExecOptions({ subAction: 'testAction', subActionParams: {} }))
      ).resolves.toMatchObject({ status: 'error' });
    });
  });

  describe('multiple registered actions', () => {
    it('dispatches to the correct handler based on subAction', async () => {
      const handler1 = jest.fn().mockResolvedValue({ from: 'action1' });
      const handler2 = jest.fn().mockResolvedValue({ from: 'action2' });

      const actions: ConnectorSpec['actions'] = {
        action1: { isTool: true, input: {} as never, handler: handler1 },
        action2: { isTool: true, input: {} as never, handler: handler2 },
      };

      const executor = generateExecutorFunction({
        actions,
        getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
      });

      const result1 = await executor(
        makeExecOptions({ subAction: 'action1', subActionParams: {} })
      );
      const result2 = await executor(
        makeExecOptions({ subAction: 'action2', subActionParams: {} })
      );

      expect(result1).toEqual({ status: 'ok', data: { from: 'action1' }, actionId: connectorId });
      expect(result2).toEqual({ status: 'ok', data: { from: 'action2' }, actionId: connectorId });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });
});
