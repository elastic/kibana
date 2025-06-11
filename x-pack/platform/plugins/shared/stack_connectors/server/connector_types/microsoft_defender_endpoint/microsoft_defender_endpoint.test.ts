/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateMicrosoftDefenderConnectorMockResponse } from './mocks';
import { microsoftDefenderEndpointConnectorMocks } from './mocks';

describe('Microsoft Defender for Endpoint Connector', () => {
  let connectorMock: CreateMicrosoftDefenderConnectorMockResponse;

  beforeEach(() => {
    connectorMock = microsoftDefenderEndpointConnectorMocks.create();
  });

  describe('#testConnector', () => {
    it('should return expected response', async () => {
      Object.entries(connectorMock.apiMock).forEach(([url, responseFn]) => {
        connectorMock.apiMock[url.replace('1-2-3', 'elastic-connector-test')] = responseFn;
      });

      await expect(
        connectorMock.instanceMock.testConnector({}, connectorMock.usageCollector)
      ).resolves.toEqual({
        results: [
          'API call to Machines API was successful',
          'API call to Machine Isolate was successful',
          'API call to Machine Release was successful',
          'API call to Machine Actions was successful',
          'API call to Machine RunScript was successful',
        ],
      });

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/machines\/elastic-connector-test$/),
        }),
        connectorMock.usageCollector
      );
      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/machines\/elastic-connector-test\/isolate$/),
        }),
        connectorMock.usageCollector
      );
      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/machines\/elastic-connector-test\/unisolate$/),
        }),
        connectorMock.usageCollector
      );
      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/\/machineactions/),
        }),
        connectorMock.usageCollector
      );
    });
  });

  describe('#isolate()', () => {
    it('should call isolate api with comment', async () => {
      await connectorMock.instanceMock.isolateHost(
        { id: '1-2-3', comment: 'foo' },
        connectorMock.usageCollector
      );

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringMatching(/\/api\/machines\/1-2-3\/isolate$/),
          data: { Comment: 'foo', IsolationType: 'Full' },
          headers: { Authorization: 'Bearer eyJN_token_JIE' },
        }),
        connectorMock.usageCollector
      );
    });

    it('should return a Machine Action', async () => {
      await expect(
        connectorMock.instanceMock.isolateHost(
          { id: '1-2-3', comment: 'foo' },
          connectorMock.usageCollector
        )
      ).resolves.toEqual(microsoftDefenderEndpointConnectorMocks.createMachineActionMock());
    });
  });

  describe('#release()', () => {
    it('should call isolate api with comment', async () => {
      await connectorMock.instanceMock.releaseHost(
        { id: '1-2-3', comment: 'foo' },
        connectorMock.usageCollector
      );

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringMatching(/\/api\/machines\/1-2-3\/unisolate$/),
          data: { Comment: 'foo' },
        }),
        connectorMock.usageCollector
      );
    });

    it('should return a machine action object', async () => {
      await expect(
        connectorMock.instanceMock.isolateHost(
          { id: '1-2-3', comment: 'foo' },
          connectorMock.usageCollector
        )
      ).resolves.toEqual(microsoftDefenderEndpointConnectorMocks.createMachineActionMock());
    });
  });

  describe('#getActions()', () => {
    it('should return expected response', async () => {
      await expect(
        connectorMock.instanceMock.getActions({}, connectorMock.usageCollector)
      ).resolves.toEqual({
        '@odata.context':
          'https://api-us3.securitycenter.microsoft.com/api/$metadata#MachineActions',
        '@odata.count': 1,
        page: 1,
        pageSize: 20,
        total: 1,
        value: [
          {
            cancellationComment: '',
            cancellationDateTimeUtc: '',
            cancellationRequestor: '',
            commands: ['RunScript'],
            computerDnsName: 'desktop-test',
            creationDateTimeUtc: '2019-01-02T14:39:38.2262283Z',
            externalID: 'abc',
            id: '5382f7ea-7557-4ab7-9782-d50480024a4e',
            lastUpdateDateTimeUtc: '2019-01-02T14:40:44.6596267Z',
            machineId: '1-2-3',
            requestSource: '',
            requestor: 'Analyst@TestPrd.onmicrosoft.com',
            requestorComment: 'test for docs',
            scope: 'Selective',
            status: 'Succeeded',
            title: '',
            type: 'Isolate',
          },
        ],
      });
    });

    it('should call Microsoft API with expected query params', async () => {
      await connectorMock.instanceMock.getActions({}, connectorMock.usageCollector);

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mock__microsoft.com/api/machineactions',
          params: { $count: true, $top: 20 },
        }),
        connectorMock.usageCollector
      );
    });

    it.each`
      title                                                      | options                                                                           | expectedParams
      ${'single value filters'}                                  | ${{ id: '123', status: 'Succeeded', machineId: 'abc', page: 2 }}                  | ${{ $count: true, $filter: "id eq '123' AND status eq 'Succeeded' AND machineId eq 'abc'", $skip: 20, $top: 20 }}
      ${'multiple value filters'}                                | ${{ id: ['123', '321'], type: ['Isolate', 'Unisolate'], page: 1, pageSize: 100 }} | ${{ $count: true, $filter: "id in ('123','321') AND type in ('Isolate','Unisolate')", $top: 100 }}
      ${'page and page size'}                                    | ${{ id: ['123', '321'], type: ['Isolate', 'Unisolate'], page: 3, pageSize: 100 }} | ${{ $count: true, $filter: "id in ('123','321') AND type in ('Isolate','Unisolate')", $skip: 200, $top: 100 }}
      ${'with sortDirection but no sortField'}                   | ${{ id: '123', sortDirection: 'asc' }}                                            | ${{ $count: true, $filter: "id eq '123'", $top: 20 }}
      ${'with sortField and no sortDirection (desc is default)'} | ${{ id: '123', sortField: 'type' }}                                               | ${{ $count: true, $filter: "id eq '123'", $top: 20, $orderby: 'type desc' }}
      ${'with sortField and sortDirection'}                      | ${{ id: '123', sortField: 'type', sortDirection: 'asc' }}                         | ${{ $count: true, $filter: "id eq '123'", $top: 20, $orderby: 'type asc' }}
    `(
      'should correctly build the oData URL params: $title',
      async ({ options, expectedParams }) => {
        await connectorMock.instanceMock.getActions(options, connectorMock.usageCollector);

        expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expectedParams,
          }),
          connectorMock.usageCollector
        );
      }
    );
  });

  describe('#getAgentList()', () => {
    it('should return expected response', async () => {
      await expect(
        connectorMock.instanceMock.getAgentList({ id: '1-2-3' }, connectorMock.usageCollector)
      ).resolves.toEqual({
        '@odata.context': 'https://api-us3.securitycenter.microsoft.com/api/$metadata#Machines',
        '@odata.count': 1,
        page: 1,
        pageSize: 20,
        total: 1,
        value: [expect.any(Object)],
      });
    });

    it('should call Microsoft API with expected query params', async () => {
      await connectorMock.instanceMock.getAgentList({ id: '1-2-3' }, connectorMock.usageCollector);

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mock__microsoft.com/api/machines',
          params: { $count: true, $filter: "id eq '1-2-3'", $top: 20 },
        }),
        connectorMock.usageCollector
      );
    });
  });

  describe('#getActionResults()', () => {
    it('should call Microsoft Defender API to retrieve action results download link', async () => {
      const actionId = 'test-action-123';
      const mockDownloadUrl = 'https://download.microsoft.com/mock-download-url/results.json';

      // Mock only the external download URL (Microsoft Defender API is mocked in mocks.ts)
      connectorMock.apiMock[mockDownloadUrl] = () =>
        microsoftDefenderEndpointConnectorMocks.createAxiosResponseMock({
          pipe: jest.fn(),
          on: jest.fn(),
          read: jest.fn(),
        });

      await connectorMock.instanceMock.getActionResults(
        { id: actionId },
        connectorMock.usageCollector
      );

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `https://api.mock__microsoft.com/api/machineactions/${actionId}/GetLiveResponseResultDownloadLink(index=0)`,
          method: 'GET',
        }),
        connectorMock.usageCollector
      );

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: mockDownloadUrl,
          method: 'get',
          responseType: 'stream',
        }),
        connectorMock.usageCollector
      );
    });

    it('should return a Stream for downloading the file', async () => {
      const actionId = 'test-action-123';
      const mockDownloadUrl = 'https://download.microsoft.com/mock-download-url/results.json';

      // Mock external download URL to return a stream (Microsoft Defender API uses default mock)
      const mockStream = { pipe: jest.fn(), on: jest.fn(), read: jest.fn() };
      connectorMock.apiMock[mockDownloadUrl] = () =>
        microsoftDefenderEndpointConnectorMocks.createAxiosResponseMock(mockStream);

      const result = await connectorMock.instanceMock.getActionResults(
        { id: actionId },
        connectorMock.usageCollector
      );

      expect(result).toEqual(mockStream);
      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: mockDownloadUrl,
          method: 'get',
          responseType: 'stream',
        }),
        connectorMock.usageCollector
      );
    });

    it('should error if download URL is not found in API response', async () => {
      const actionId = 'test-action-123';

      // Override the default mock to return null
      connectorMock.apiMock[
        `https://api.mock__microsoft.com/api/machineactions/${actionId}/GetLiveResponseResultDownloadLink(index=0)`
      ] = () => microsoftDefenderEndpointConnectorMocks.createAxiosResponseMock({ value: null });

      await expect(
        connectorMock.instanceMock.getActionResults({ id: actionId }, connectorMock.usageCollector)
      ).rejects.toThrow(`Download URL for script results of machineId [${actionId}] not found`);
    });

    it('should error if download URL is empty string in API response', async () => {
      const actionId = 'test-action-123';

      // Override the default mock to return empty string
      connectorMock.apiMock[
        `https://api.mock__microsoft.com/api/machineactions/${actionId}/GetLiveResponseResultDownloadLink(index=0)`
      ] = () => microsoftDefenderEndpointConnectorMocks.createAxiosResponseMock({ value: '' });

      await expect(
        connectorMock.instanceMock.getActionResults({ id: actionId }, connectorMock.usageCollector)
      ).rejects.toThrow(`Download URL for script results of machineId [${actionId}] not found`);
    });

    it('should handle Microsoft Defender API errors for download link retrieval', async () => {
      const actionId = 'test-action-123';

      // Override the default mock to throw an error
      connectorMock.apiMock[
        `https://api.mock__microsoft.com/api/machineactions/${actionId}/GetLiveResponseResultDownloadLink(index=0)`
      ] = () => {
        throw new Error('Microsoft Defender API error');
      };

      await expect(
        connectorMock.instanceMock.getActionResults({ id: actionId }, connectorMock.usageCollector)
      ).rejects.toThrow('Microsoft Defender API error');
    });

    it('should handle file download errors', async () => {
      const actionId = 'test-action-123';
      const mockDownloadUrl = 'https://download.microsoft.com/mock-download-url/results.json';

      // Mock external download URL to throw an error (Microsoft Defender API uses default mock)
      connectorMock.apiMock[mockDownloadUrl] = () => {
        throw new Error('File download failed');
      };

      await expect(
        connectorMock.instanceMock.getActionResults({ id: actionId }, connectorMock.usageCollector)
      ).rejects.toThrow('File download failed');
    });
  });
});
