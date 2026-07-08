/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkdayConnector } from './workday';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { CONNECTOR_ID as WORKDAY_CONNECTOR_ID } from '@kbn/connector-schemas/workday';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { WorkdayError } from './error';

const apiUrl = 'https://wd2-impl-services1.workday.com/ccx/api/v1/mytenant';
const tokenUrl = 'https://wd2-impl-services1.workday.com/ccx/oauth2/mytenant/token';

describe('WorkdayConnector', () => {
  const logger = loggingSystemMock.createLogger();
  let connector: WorkdayConnector;
  let mockedRequest: jest.Mock;
  let connectorUsageCollector: ConnectorUsageCollector;
  let services: ReturnType<typeof actionsMock.createServices>;

  const mockToken = {
    id: 'token-id',
    connectorId: 'connector-id',
    tokenType: 'access_token',
    token: 'wd-access-token',
    expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    services = actionsMock.createServices();

    jest.spyOn(services.connectorTokenClient, 'get');
    jest
      .spyOn(services.connectorTokenClient, 'updateOrReplace')
      .mockResolvedValue(undefined as unknown as void);

    connector = new WorkdayConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: WORKDAY_CONNECTOR_ID },
      config: { apiUrl, tokenUrl },
      secrets: { clientId: 'cid', clientSecret: 'csecret' },
      logger,
      services,
    });

    // @ts-expect-error swap out the underlying HTTP layer
    mockedRequest = connector.request = jest.fn() as jest.Mock;

    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    jest.mocked(services.connectorTokenClient.get).mockResolvedValue({
      hasErrors: false,
      connectorToken: mockToken,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorker', () => {
    it('GETs the worker resource with a Bearer token', async () => {
      const worker = { id: 'abc123', primaryWorkEmail: 'a@b.com' };
      mockedRequest.mockResolvedValueOnce({ data: worker });

      const result = await connector.getWorker({ workerId: 'abc123' }, connectorUsageCollector);

      expect(services.connectorTokenClient.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `${apiUrl}/workers/abc123`,
          headers: expect.objectContaining({
            Authorization: 'Bearer wd-access-token',
            Accept: 'application/json',
          }),
        }),
        connectorUsageCollector
      );
      expect(result).toEqual(worker);
    });

    it('percent-encodes the worker ID in the URL', async () => {
      mockedRequest.mockResolvedValueOnce({ data: {} });
      await connector.getWorker({ workerId: 'a b/c' }, connectorUsageCollector);
      expect(mockedRequest.mock.calls[0][0].url).toBe(`${apiUrl}/workers/a%20b%2Fc`);
    });
  });

  describe('searchWorkers', () => {
    it('GETs /workers with a search param and optional pagination', async () => {
      const body = { total: 1, data: [{ id: 'x' }] };
      mockedRequest.mockResolvedValueOnce({ data: body });

      const result = await connector.searchWorkers(
        { search: 'jane', limit: 10, offset: 20 },
        connectorUsageCollector
      );

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `${apiUrl}/workers`,
          params: { search: 'jane', limit: 10, offset: 20 },
          headers: expect.objectContaining({ Authorization: 'Bearer wd-access-token' }),
        }),
        connectorUsageCollector
      );
      expect(result).toEqual(body);
    });

    it('omits limit/offset when not provided', async () => {
      mockedRequest.mockResolvedValueOnce({ data: {} });
      await connector.searchWorkers({ search: 'jane' }, connectorUsageCollector);
      expect(mockedRequest.mock.calls[0][0].params).toEqual({ search: 'jane' });
    });
  });

  describe('401 refresh-and-retry', () => {
    it('refreshes the token and retries once on 401', async () => {
      mockedRequest
        // First call: the API request fails with 401
        .mockImplementationOnce(async () => {
          const err = new Error('unauthorized');
          (err as unknown as { response: { status: number } }).response = { status: 401 };
          throw err;
        })
        // Refresh call: token endpoint returns a new token
        .mockResolvedValueOnce({
          data: {
            access_token: 'wd-new-token',
            expires_in: 3600,
            token_type: 'bearer',
          },
        })
        // Retry of the original API request succeeds
        .mockResolvedValueOnce({ data: { id: 'x' } });

      const result = await connector.getWorker({ workerId: 'x' }, connectorUsageCollector);

      expect(services.connectorTokenClient.updateOrReplace).toHaveBeenCalled();
      expect(mockedRequest).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ id: 'x' });
    });

    it('throws WorkdayError when the request fails without 401', async () => {
      mockedRequest.mockImplementationOnce(async () => {
        throw new Error('Status code: 500. Message: boom');
      });

      await expect(
        connector.getWorker({ workerId: 'x' }, connectorUsageCollector)
      ).rejects.toBeInstanceOf(WorkdayError);
    });
  });
});
