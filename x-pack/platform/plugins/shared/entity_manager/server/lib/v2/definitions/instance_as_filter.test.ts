/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityV2 } from '@kbn/entities-schema';
import { instanceAsFilter } from './instance_as_filter';
import { readSourceDefinitions } from './source_definition';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { EntitySourceDefinition } from '../types';
import { UnknownEntityType } from '../errors/unknown_entity_type';
import { InvalidEntityInstance } from '../errors/invalid_entity_instance';

const readSourceDefinitionsMock = readSourceDefinitions as jest.Mock;
jest.mock('./source_definition', () => ({
  readSourceDefinitions: jest.fn(),
}));
const esClientMock = elasticsearchServiceMock.createClusterClient();
const logger = loggerMock.create();

describe('instanceAsFilter', () => {
  it('throws if no sources are found for the type', async () => {
    const instance: EntityV2 = {
      'entity.type': 'my_type',
      'entity.id': 'whatever',
      'entity.display_name': 'Whatever',
    };

    const sources: EntitySourceDefinition[] = [];
    readSourceDefinitionsMock.mockResolvedValue(sources);

    await expect(instanceAsFilter(instance, esClientMock, logger)).rejects.toThrowError(
      UnknownEntityType
    );
  });

  it('throws if the instance cannot match any sources due to missing identity fields', async () => {
    const instance: EntityV2 = {
      'entity.type': 'my_type',
      'entity.id': 'whatever',
      'entity.display_name': 'Whatever',
    };

    const sources: EntitySourceDefinition[] = [
      {
        id: 'my_source',
        type_id: 'my_type',
        identity_fields: ['host.name'],
        index_patterns: [],
        metadata_fields: [],
        filters: [],
      },
    ];
    readSourceDefinitionsMock.mockResolvedValue(sources);

    await expect(instanceAsFilter(instance, esClientMock, logger)).rejects.toThrowError(
      InvalidEntityInstance
    );
  });

  it('creates a single source filter for a single identity field', async () => {
    const instance: EntityV2 = {
      'entity.type': 'my_type',
      'entity.id': 'whatever',
      'entity.display_name': 'Whatever',
      'host.name': 'my_host',
    };

    const sources: EntitySourceDefinition[] = [
      {
        id: 'my_source',
        type_id: 'my_type',
        identity_fields: ['host.name'],
        index_patterns: [],
        metadata_fields: [],
        filters: [],
      },
    ];
    readSourceDefinitionsMock.mockResolvedValue(sources);

    await expect(instanceAsFilter(instance, esClientMock, logger)).resolves.toBe(
      '(host.name: "my_host")'
    );
  });

  it('creates a single source filter for multiple identity field', async () => {
    const instance: EntityV2 = {
      'entity.type': 'my_type',
      'entity.id': 'whatever',
      'entity.display_name': 'Whatever',
      'host.name': 'my_host',
      'host.os': 'my_os',
    };

    const sources: EntitySourceDefinition[] = [
      {
        id: 'my_source',
        type_id: 'my_type',
        identity_fields: ['host.name', 'host.os'],
        index_patterns: [],
        metadata_fields: [],
        filters: [],
      },
    ];
    readSourceDefinitionsMock.mockResolvedValue(sources);

    await expect(instanceAsFilter(instance, esClientMock, logger)).resolves.toBe(
      '(host.name: "my_host" AND host.os: "my_os")'
    );
  });

  it('creates multiple source filters for a single identity field', async () => {
    const instance: EntityV2 = {
      'entity.type': 'my_type',
      'entity.id': 'whatever',
      'entity.display_name': 'Whatever',
      'host.name': 'my_host',
      'host.os': 'my_os',
    };

    const sources: EntitySourceDefinition[] = [
      {
        id: 'my_source_host',
        type_id: 'my_type',
        identity_fields: ['host.name'],
        index_patterns: [],
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'my_source_os',
        type_id: 'my_type',
        identity_fields: ['host.os'],
        index_patterns: [],
        metadata_fields: [],
        filters: [],
      },
    ];
    readSourceDefinitionsMock.mockResolvedValue(sources);

    await expect(instanceAsFilter(instance, esClientMock, logger)).resolves.toBe(
      '(host.name: "my_host") OR (host.os: "my_os")'
    );
  });

  it('creates multiple source filters for multiple identity field', async () => {
    const instance: EntityV2 = {
      'entity.type': 'my_type',
      'entity.id': 'whatever',
      'entity.display_name': 'Whatever',
      'host.name': 'my_host',
      'host.os': 'my_os',
      'host.arch': 'my_arch',
    };

    const sources: EntitySourceDefinition[] = [
      {
        id: 'my_source_host',
        type_id: 'my_type',
        identity_fields: ['host.name', 'host.arch'],
        index_patterns: [],
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'my_source_os',
        type_id: 'my_type',
        identity_fields: ['host.os', 'host.arch'],
        index_patterns: [],
        metadata_fields: [],
        filters: [],
      },
    ];
    readSourceDefinitionsMock.mockResolvedValue(sources);

    await expect(instanceAsFilter(instance, esClientMock, logger)).resolves.toBe(
      '(host.name: "my_host" AND host.arch: "my_arch") OR (host.os: "my_os" AND host.arch: "my_arch")'
    );
  });
});
