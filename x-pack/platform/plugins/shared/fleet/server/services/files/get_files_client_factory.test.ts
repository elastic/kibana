/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import type { FilesClientFactory } from './types';
import { FleetFromHostFilesClient } from './client_from_host';
import { FleetToHostFilesClient } from './client_to_host';

import { getFilesClientFactory } from './get_files_client_factory';

jest.mock('@kbn/files-plugin/server');

describe('getFilesClientFactory()', () => {
  let clientFactory: FilesClientFactory;

  beforeEach(() => {
    clientFactory = getFilesClientFactory({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger: loggingSystemMock.create().asLoggerFactory(),
    });
  });

  it('should return a client when `fromHost()` is called', () => {
    expect(clientFactory.fromHost('endpoint')).toBeInstanceOf(FleetFromHostFilesClient);
  });

  it('should return a client when `toHost()` is called', () => {
    expect(clientFactory.toHost('endpoint')).toBeInstanceOf(FleetToHostFilesClient);
  });

  it('should throw an error if `fromHost()` is called, but package name is not authorized', () => {
    expect(() => clientFactory.fromHost('foo')).toThrow(
      'Integration name [foo] does not have access to files received from host'
    );
  });

  it('should throw an error if `toHost()` is called, but package name is not authorized', () => {
    expect(() => clientFactory.toHost('foo')).toThrow(
      'Integration name [foo] does not have access to files for delivery to host'
    );
  });
});
