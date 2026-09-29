/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import type { DataSourceWithSecrets } from '../common';
import { DATA_SOURCES_LIST_ROUTE_PATH, getDataSourceByIdApiPath, type DataSource } from '../common';
import { DataSourcesClient } from './data_sources_client';

const createHttpMock = (): Pick<HttpStart, 'get' | 'put' | 'delete'> => ({
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

describe('DataSourcesClient', () => {
  describe('get', () => {
    it('returns the data_sources array from the response body', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const sources: DataSource[] = [
        { type: 's3', name: 'a', description: '', settings: {} },
        { type: 'gcs', name: 'b', description: '', settings: {} },
      ];

      (http.get as jest.Mock).mockResolvedValue({ data_sources: sources });

      await expect(client.get()).resolves.toEqual(sources);
      expect(http.get).toHaveBeenCalledWith(DATA_SOURCES_LIST_ROUTE_PATH);
    });
  });

  describe('getById', () => {
    it('throws when id is empty/whitespace', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      await expect(client.getById('  ')).rejects.toThrow('Name is required.');
    });

    it('trims the id and calls http.get with the id path', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const response: DataSource = { type: 's3', name: 'x', description: '', settings: {} };
      (http.get as jest.Mock).mockResolvedValue(response);

      await expect(client.getById('  my_id  ')).resolves.toEqual(response);
      expect(http.get).toHaveBeenCalledWith(getDataSourceByIdApiPath('my_id'));
    });
  });

  describe('add', () => {
    it('throws when name is empty/whitespace', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: '   ',
        description: '',
        settings: {},
      };

      await expect(client.add(data)).rejects.toThrow('Name is required.');
      expect(http.put).not.toHaveBeenCalled();
    });

    it('throws when name is not a valid data source id', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: 'SomeUpperCaseLetters',
        description: '',
        settings: {},
      };

      await expect(client.add(data)).rejects.toThrow('Name must be lowercase.');
      expect(http.put).not.toHaveBeenCalled();
    });

    it('PUTs to the id route and omits empty settings fields', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: '  ds1  ',
        description: '',
        settings: {
          region: '',
          endpoint: 'https://s3.example',
          auth: '',
          access_key: '',
          secret_key: 'SECRET',
          role_arn: undefined,
          jwt_audience: undefined,
          role_session_name: '',
          sts_endpoint: '',
          sts_region: '',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await expect(client.add(data)).resolves.toBeUndefined();

      const expectedBody = {
        type: 's3',
        description: '',
        settings: {
          endpoint: 'https://s3.example',
          secret_key: 'SECRET',
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });
  });

  describe('update', () => {
    it('throws when name is empty/whitespace', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: '   ',
        description: '',
        settings: {},
      };

      await expect(client.update(data)).rejects.toThrow('Name is required.');
      expect(http.put).not.toHaveBeenCalled();
    });

    it('omits an untouched redacted secret field so the stored value is preserved', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: 'ds1',
        description: '',
        settings: {
          endpoint: 'https://s3.example',
          access_key: '::es_redacted::',
          secret_key: '::es_redacted::',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await expect(client.update(data)).resolves.toBeUndefined();

      const expectedBody = {
        type: 's3',
        description: '',
        settings: {
          endpoint: 'https://s3.example',
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });

    it('sends a changed secret value to replace it', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: 'ds1',
        description: '',
        settings: {
          access_key: '::es_redacted::',
          secret_key: 'NEW_SECRET',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await client.update(data);

      const expectedBody = {
        type: 's3',
        description: '',
        settings: {
          secret_key: 'NEW_SECRET',
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });

    it('sends an explicit null to clear a secret the user emptied', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: 'ds1',
        description: '',
        settings: {
          access_key: '::es_redacted::',
          secret_key: '',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await client.update(data);

      const expectedBody = {
        type: 's3',
        description: '',
        settings: {
          secret_key: null,
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });

    it('sends an explicit null for a secret field dropped by an auth-mode switch', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      // Switching away from access-and-secret-key auth drops access_key/secret_key from
      // settings entirely (see applyAuthenticationModeToDataSource) rather than sending
      // them as empty strings.
      const data: DataSourceWithSecrets = {
        type: 's3',
        name: 'ds1',
        description: '',
        settings: {
          auth: 'anonymous',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await client.update(data);

      const expectedBody = {
        type: 's3',
        description: '',
        settings: {
          auth: 'anonymous',
          access_key: null,
          secret_key: null,
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });

    it('still omits empty plaintext fields', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 's3',
        name: 'ds1',
        description: '',
        settings: {
          region: '',
          endpoint: 'https://s3.example',
          role_arn: undefined,
          access_key: '::es_redacted::',
          secret_key: '::es_redacted::',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await client.update(data);

      const expectedBody = {
        type: 's3',
        description: '',
        settings: {
          endpoint: 'https://s3.example',
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });

    it('omits an untouched redacted secret for a GCS data source', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 'gcs',
        name: 'ds1',
        description: '',
        settings: {
          endpoint: 'https://gcs.example',
          credentials: '::es_redacted::',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await client.update(data);

      const expectedBody = {
        type: 'gcs',
        description: '',
        settings: {
          endpoint: 'https://gcs.example',
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });

    it('never nulls Azure connection_string/sas_token, which the flyout does not manage', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      // The Azure flyout only ever submits `key` for credentials auth, so `settings`
      // here never contains connection_string/sas_token even when the stored data
      // source (e.g. created via the API) authenticates with one of those instead.
      const data: DataSourceWithSecrets = {
        type: 'azure',
        name: 'ds1',
        description: '',
        settings: {
          endpoint: 'https://azure.example',
          key: '::es_redacted::',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await client.update(data);

      const expectedBody = {
        type: 'azure',
        description: '',
        settings: {
          endpoint: 'https://azure.example',
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });

    it('sends an explicit null to clear an Azure key the user emptied', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      const data: DataSourceWithSecrets = {
        type: 'azure',
        name: 'ds1',
        description: '',
        settings: {
          key: '',
        },
      };

      (http.put as jest.Mock).mockResolvedValue(undefined);

      await client.update(data);

      const expectedBody = {
        type: 'azure',
        description: '',
        settings: {
          key: null,
        },
      };

      expect(http.put).toHaveBeenCalledWith(getDataSourceByIdApiPath('ds1'), {
        body: JSON.stringify(expectedBody),
      });
    });
  });

  describe('delete', () => {
    it('deletes a single name', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      (http.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(client.delete('a')).resolves.toBeUndefined();
      expect(http.delete).toHaveBeenCalledWith(getDataSourceByIdApiPath('a'));
    });

    it('deletes each name in the list', async () => {
      const http = createHttpMock();
      const client = new DataSourcesClient(http as unknown as HttpStart);

      (http.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(client.delete(['a', 'b'])).resolves.toBeUndefined();
      expect(http.delete).toHaveBeenNthCalledWith(1, getDataSourceByIdApiPath('a'));
      expect(http.delete).toHaveBeenNthCalledWith(2, getDataSourceByIdApiPath('b'));
    });
  });
});
