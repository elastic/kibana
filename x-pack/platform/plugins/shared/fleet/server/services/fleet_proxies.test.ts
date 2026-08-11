/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';

import type { Logger } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { FLEET_PROXY_SAVED_OBJECT_TYPE } from '../constants';

import { appContextService } from './app_context';

import { createFleetProxy, deleteFleetProxy, bulkCreateFleetProxies } from './fleet_proxies';
import { fleetServerHostService } from './fleet_server_host';
import { outputService } from './output';
import { downloadSourceService } from './download_source';

jest.mock('./output');
jest.mock('./download_source');
jest.mock('./fleet_server_host');
jest.mock('./app_context');

const mockedFleetServerHostService = fleetServerHostService as jest.Mocked<
  typeof fleetServerHostService
>;
const mockedOutputService = outputService as jest.Mocked<typeof outputService>;
const mockedDownloadSourceService = downloadSourceService as jest.Mocked<
  typeof downloadSourceService
>;

const PROXY_IDS = {
  PRECONFIGURED: 'test-preconfigured',
  RELATED_PRECONFIGURED: 'test-related-preconfigured',
};
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

let mockedLogger: jest.Mocked<Logger>;

describe('Fleet proxies service', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });

  const soClientMock = savedObjectsClientMock.create();
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    mockedDownloadSourceService.listAllForProxyId.mockReset();
    mockedOutputService.update.mockReset();
    soClientMock.delete.mockReset();
    mockedFleetServerHostService.update.mockReset();
    mockedFleetServerHostService.listAllForProxyId.mockReset();
    mockedDownloadSourceService.listAllForProxyId.mockImplementation(async () => ({
      items: [],
      total: 0,
    }));
    mockedOutputService.listAllForProxyId.mockImplementation(async (proxyId) => {
      if (proxyId === PROXY_IDS.RELATED_PRECONFIGURED) {
        return {
          items: [
            {
              id: 'test',
              is_preconfigured: true,
              type: 'elasticsearch',
              name: 'test',
              proxy_id: proxyId,
              is_default: false,
              is_default_monitoring: false,
            },
          ],
          total: 1,
          page: 1,
          perPage: 10,
        };
      }

      return {
        items: [],
        total: 0,
        page: 1,
        perPage: 10,
      };
    });
    mockedFleetServerHostService.listAllForProxyId.mockImplementation(async (proxyId) => {
      if (proxyId === PROXY_IDS.RELATED_PRECONFIGURED) {
        return {
          items: [
            {
              id: 'test',
              is_preconfigured: true,
              host_urls: ['http://test.fr'],
              is_default: false,
              name: 'test',
              proxy_id: proxyId,
            },
          ],
          total: 1,
          page: 1,
          perPage: 10,
        };
      }

      return {
        items: [],
        total: 0,
        page: 1,
        perPage: 10,
      };
    });
    soClientMock.get.mockImplementation(async (type, id) => {
      if (type !== FLEET_PROXY_SAVED_OBJECT_TYPE) {
        throw new Error(`${type} not mocked in SO client`);
      }

      if (id === PROXY_IDS.PRECONFIGURED) {
        return {
          id,
          type,
          attributes: {
            is_preconfigured: true,
          },
          references: [],
        };
      }

      if (id === PROXY_IDS.RELATED_PRECONFIGURED) {
        return {
          id,
          type,
          attributes: {
            is_preconfigured: false,
          },
          references: [],
        };
      }

      throw new Error(`${id} not found`);
    });
  });

  describe('bulkCreateFleetProxies', () => {
    it('should return empty array without calling soClient when given no proxies', async () => {
      const result = await bulkCreateFleetProxies(soClientMock, []);
      expect(result).toEqual([]);
      expect(soClientMock.bulkCreate).not.toBeCalled();
    });

    it('should throw if any item in the bulk response has an error', async () => {
      soClientMock.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'proxy-1',
            type: FLEET_PROXY_SAVED_OBJECT_TYPE,
            attributes: { name: 'proxy-1', url: 'http://proxy.fr', is_preconfigured: false },
            references: [],
            error: { statusCode: 409, error: 'Conflict', message: 'Document already exists' },
          },
        ],
      } as any);

      await expect(() =>
        bulkCreateFleetProxies(soClientMock, [
          { name: 'proxy-1', url: 'http://proxy.fr', is_preconfigured: false },
        ])
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('create', () => {
    it('should throw FleetError when given an invalid id', async () => {
      await expect(
        createFleetProxy(
          soClientMock,
          { name: 'Test', url: 'http://proxy.co', is_preconfigured: false },
          { id: '../bad-id' }
        )
      ).rejects.toThrow('id is not valid');
    });
  });

  describe('delete', () => {
    it('should not allow to delete preconfigured proxy', async () => {
      await expect(() =>
        deleteFleetProxy(soClientMock, esClientMock, PROXY_IDS.PRECONFIGURED)
      ).rejects.toThrowError(/Cannot delete test-preconfigured preconfigured proxy/);
    });

    it('should allow to delete preconfigured proxy with option fromPreconfiguration:true', async () => {
      await deleteFleetProxy(soClientMock, esClientMock, PROXY_IDS.PRECONFIGURED, {
        fromPreconfiguration: true,
      });

      expect(soClientMock.delete).toBeCalled();
    });

    it('should not allow to delete proxy with related preconfigured saved object', async () => {
      await expect(() =>
        deleteFleetProxy(soClientMock, esClientMock, PROXY_IDS.RELATED_PRECONFIGURED)
      ).rejects.toThrowError(
        /Cannot delete a proxy used in a preconfigured fleet server hosts or output./
      );
    });

    it('should allow to delete proxy wiht related preconfigured saved object option fromPreconfiguration:true', async () => {
      await deleteFleetProxy(soClientMock, esClientMock, PROXY_IDS.RELATED_PRECONFIGURED, {
        fromPreconfiguration: true,
      });
      expect(mockedOutputService.update).toBeCalled();
      expect(mockedFleetServerHostService.update).toBeCalled();
      expect(soClientMock.delete).toBeCalled();
    });
  });
});
