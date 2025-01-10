/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityV2 } from '@kbn/entities-schema';
import { readSourceDefinitions } from './source_definition';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { EntitySourceDefinition } from '../types';
import { UnknownEntityType } from '../errors/unknown_entity_type';
import { identityFieldsBySource } from './identity_fields_by_source';

const readSourceDefinitionsMock = readSourceDefinitions as jest.Mock;
jest.mock('./source_definition', () => ({
  readSourceDefinitions: jest.fn(),
}));
const esClientMock = elasticsearchServiceMock.createClusterClient();
const logger = loggerMock.create();

describe('identityFieldsBySource', () => {
  it('throws if no sources are found for the type', async () => {
    const instance: EntityV2 = {
      'entity.type': 'my_type',
      'entity.id': 'whatever',
      'entity.display_name': 'Whatever',
    };

    const sources: EntitySourceDefinition[] = [];
    readSourceDefinitionsMock.mockResolvedValue(sources);

    await expect(
      identityFieldsBySource(instance['entity.type'], esClientMock, logger)
    ).rejects.toThrowError(UnknownEntityType);
  });

  it('returns the correct identity fields with a single source', async () => {
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

    await expect(
      identityFieldsBySource(instance['entity.type'], esClientMock, logger)
    ).resolves.toEqual({
      my_source: ['host.name'],
    });
  });

  it('returns the correct identity fields with multiple sources', async () => {
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

    await expect(
      identityFieldsBySource(instance['entity.type'], esClientMock, logger)
    ).resolves.toEqual({
      my_source_host: ['host.name'],
      my_source_os: ['host.os'],
    });
  });
});
