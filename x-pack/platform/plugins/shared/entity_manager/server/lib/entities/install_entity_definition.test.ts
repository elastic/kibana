/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import moment from 'moment';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EntityDefinition } from '@kbn/entities-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  installBuiltInEntityDefinitions,
  installEntityDefinition,
} from './install_entity_definition';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import {
  generateLatestIndexTemplateId,
  generateLatestIngestPipelineId,
  generateLatestTransformId,
} from './helpers/generate_component_id';
import { generateLatestTransform } from './transform/generate_latest_transform';
import { entityDefinition as mockEntityDefinition } from './helpers/fixtures/entity_definition';
import { EntityDefinitionIdInvalid } from './errors/entity_definition_id_invalid';
import { EntityIdConflict } from './errors/entity_id_conflict_error';

const getExpectedInstalledComponents = (definition: EntityDefinition) => {
  return [
    { type: 'template', id: generateLatestIndexTemplateId(definition) },
    { type: 'ingest_pipeline', id: generateLatestIngestPipelineId(definition) },
    { type: 'transform', id: generateLatestTransformId(definition) },
  ];
};

const assertHasCreatedDefinition = (
  definition: EntityDefinition,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  expect(soClient.create).toBeCalledTimes(1);
  expect(soClient.create).toBeCalledWith(
    SO_ENTITY_DEFINITION_TYPE,
    {
      ...definition,
      installStatus: 'installing',
      installStartedAt: expect.any(String),
      installedComponents: [],
    },
    {
      id: definition.id,
      overwrite: true,
      managed: definition.managed,
    }
  );
  expect(soClient.update).toBeCalledTimes(1);
  expect(soClient.update).toBeCalledWith(SO_ENTITY_DEFINITION_TYPE, definition.id, {
    installStatus: 'installed',
    installedComponents: getExpectedInstalledComponents(definition),
  });

  expect(esClient.indices.putIndexTemplate).toBeCalledTimes(1);
  expect(esClient.indices.putIndexTemplate).toBeCalledWith(
    expect.objectContaining({
      name: `entities_v1_latest_${definition.id}_index_template`,
    })
  );

  expect(esClient.ingest.putPipeline).toBeCalledTimes(1);
  expect(esClient.ingest.putPipeline).toBeCalledWith({
    id: generateLatestIngestPipelineId(definition),
    processors: expect.anything(),
    _meta: {
      definition_version: definition.version,
      managed: definition.managed,
    },
  });

  expect(esClient.transform.putTransform).toBeCalledTimes(1);
  expect(esClient.transform.putTransform).toBeCalledWith(generateLatestTransform(definition));
};

const assertHasUpgradedDefinition = (
  definition: EntityDefinition,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  expect(soClient.update).toBeCalledTimes(2);
  expect(soClient.update).toBeCalledWith(SO_ENTITY_DEFINITION_TYPE, definition.id, {
    ...definition,
    installStatus: 'upgrading',
    installStartedAt: expect.any(String),
    installedComponents: getExpectedInstalledComponents(definition),
  });
  expect(soClient.update).toBeCalledWith(SO_ENTITY_DEFINITION_TYPE, definition.id, {
    installStatus: 'installed',
    installedComponents: getExpectedInstalledComponents(definition),
  });

  expect(esClient.indices.putIndexTemplate).toBeCalledTimes(1);
  expect(esClient.indices.putIndexTemplate).toBeCalledWith(
    expect.objectContaining({
      name: `entities_v1_latest_${definition.id}_index_template`,
    })
  );

  expect(esClient.ingest.putPipeline).toBeCalledTimes(1);
  expect(esClient.ingest.putPipeline).toBeCalledWith({
    id: generateLatestIngestPipelineId(definition),
    processors: expect.anything(),
    _meta: {
      definition_version: definition.version,
      managed: definition.managed,
    },
  });

  expect(esClient.transform.putTransform).toBeCalledTimes(1);
  expect(esClient.transform.putTransform).toBeCalledWith(generateLatestTransform(definition));
};

const assertHasDeletedDefinition = (
  definition: EntityDefinition,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  assertHasDeletedTransforms(definition, esClient);

  expect(esClient.ingest.deletePipeline).toBeCalledTimes(1);
  expect(esClient.ingest.deletePipeline).toBeCalledWith(
    {
      id: generateLatestIngestPipelineId(definition),
    },
    { ignore: [404] }
  );

  expect(esClient.indices.deleteIndexTemplate).toBeCalledTimes(1);
  expect(esClient.indices.deleteIndexTemplate).toBeCalledWith(
    {
      name: generateLatestIndexTemplateId(definition),
    },
    { ignore: [404] }
  );

  expect(soClient.delete).toBeCalledTimes(1);
  expect(soClient.delete).toBeCalledWith(SO_ENTITY_DEFINITION_TYPE, definition.id);
};

const assertHasDeletedTransforms = (
  definition: EntityDefinition,
  esClient: ElasticsearchClient
) => {
  expect(esClient.transform.stopTransform).toBeCalledTimes(1);
  expect(esClient.transform.stopTransform).toBeCalledWith(
    expect.objectContaining({
      transform_id: generateLatestTransformId(definition),
    }),
    expect.anything()
  );

  expect(esClient.transform.deleteTransform).toBeCalledTimes(1);
  expect(esClient.transform.deleteTransform).toBeCalledWith(
    expect.objectContaining({
      transform_id: generateLatestTransformId(definition),
    }),
    expect.anything()
  );
};

describe('install_entity_definition', () => {
  describe('installEntityDefinition', () => {
    it('should reject invalid ids', async () => {
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      const soClient = savedObjectsClientMock.create();

      await expect(
        installEntityDefinition({
          esClient,
          soClient,
          definition: { id: 'a'.repeat(50) } as EntityDefinition,
          logger: loggerMock.create(),
        })
      ).rejects.toThrow(EntityDefinitionIdInvalid);
    });

    it('should reject if id already exists', async () => {
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              ...mockEntityDefinition,
              installStatus: 'installed',
              installedComponents: [],
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      });

      await expect(
        installEntityDefinition({
          esClient,
          soClient,
          definition: mockEntityDefinition,
          logger: loggerMock.create(),
        })
      ).rejects.toThrow(EntityIdConflict);
    });

    it('should install a definition', async () => {
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10 });
      soClient.update.mockResolvedValue({
        id: mockEntityDefinition.id,
        type: 'entity-definition',
        references: [],
        attributes: {},
      });

      await installEntityDefinition({
        esClient,
        soClient,
        definition: mockEntityDefinition,
        logger: loggerMock.create(),
      });

      assertHasCreatedDefinition(mockEntityDefinition, soClient, esClient);
    });

    it('should rollback the installation on failure', async () => {
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10 });
      esClient.transform.putTransform.mockRejectedValue(new Error('cannot install transform'));

      await expect(
        installEntityDefinition({
          esClient,
          soClient,
          definition: mockEntityDefinition,
          logger: loggerMock.create(),
        })
      ).rejects.toThrow(/cannot install transform/);

      assertHasDeletedDefinition(mockEntityDefinition, soClient, esClient);
    });
  });

  describe('installBuiltInEntityDefinitions', () => {
    it('should install definition when not found', async () => {
      const builtInDefinitions = [mockEntityDefinition];
      const esClient = elasticsearchClientMock.createElasticsearchClient();
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10 });
      soClient.update.mockResolvedValue({
        id: mockEntityDefinition.id,
        type: 'entity-definition',
        references: [],
        attributes: {},
      });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: builtInDefinitions,
        logger: loggerMock.create(),
      });

      assertHasCreatedDefinition(mockEntityDefinition, soClient, esClient);
    });

    it('should reinstall when partial state found', async () => {
      const builtInDefinitions = [mockEntityDefinition];
      const esClient = elasticsearchClientMock.createElasticsearchClient();
      // mock partially installed definition
      esClient.ingest.getPipeline.mockResolvedValue({});
      esClient.transform.getTransformStats.mockResolvedValue({ transforms: [], count: 0 });
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              ...mockEntityDefinition,
              installStatus: 'installed',
              installedComponents: getExpectedInstalledComponents(mockEntityDefinition),
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      });
      soClient.update.mockResolvedValue({
        id: mockEntityDefinition.id,
        type: 'entity-definition',
        references: [],
        attributes: {},
      });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: builtInDefinitions,
        logger: loggerMock.create(),
      });

      assertHasDeletedTransforms(mockEntityDefinition, esClient);
      assertHasUpgradedDefinition(mockEntityDefinition, soClient, esClient);
    });

    it('should reinstall when outdated version', async () => {
      const updatedDefinition = {
        ...mockEntityDefinition,
        version: semver.inc(mockEntityDefinition.version, 'major') ?? '0.0.0',
      };
      const esClient = elasticsearchClientMock.createElasticsearchClient();
      esClient.transform.getTransformStats.mockResolvedValue({ transforms: [], count: 0 });
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              ...mockEntityDefinition,
              installStatus: 'installed',
              installedComponents: getExpectedInstalledComponents(mockEntityDefinition),
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      });
      soClient.update.mockResolvedValue({
        id: mockEntityDefinition.id,
        type: 'entity-definition',
        references: [],
        attributes: {},
      });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: [updatedDefinition],
        logger: loggerMock.create(),
      });

      assertHasDeletedTransforms(mockEntityDefinition, esClient);
      assertHasUpgradedDefinition(updatedDefinition, soClient, esClient);
    });

    it('should reinstall when stale upgrade', async () => {
      const updatedDefinition = {
        ...mockEntityDefinition,
        version: semver.inc(mockEntityDefinition.version, 'major') ?? '0.0.0',
      };
      const esClient = elasticsearchClientMock.createElasticsearchClient();
      esClient.transform.getTransformStats.mockResolvedValue({ transforms: [], count: 0 });
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              ...mockEntityDefinition,
              // upgrading for 1h
              installStatus: 'upgrading',
              installStartedAt: moment().subtract(1, 'hour').toISOString(),
              installedComponents: getExpectedInstalledComponents(mockEntityDefinition),
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      });
      soClient.update.mockResolvedValue({
        id: mockEntityDefinition.id,
        type: 'entity-definition',
        references: [],
        attributes: {},
      });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: [updatedDefinition],
        logger: loggerMock.create(),
      });

      assertHasDeletedTransforms(mockEntityDefinition, esClient);
      assertHasUpgradedDefinition(updatedDefinition, soClient, esClient);
    });

    it('should reinstall when failed installation', async () => {
      const esClient = elasticsearchClientMock.createElasticsearchClient();
      esClient.transform.getTransformStats.mockResolvedValue({ transforms: [], count: 0 });
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              ...mockEntityDefinition,
              installStatus: 'failed',
              installStartedAt: new Date().toISOString(),
              installedComponents: getExpectedInstalledComponents(mockEntityDefinition),
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      });
      soClient.update.mockResolvedValue({
        id: mockEntityDefinition.id,
        type: 'entity-definition',
        references: [],
        attributes: {},
      });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: [mockEntityDefinition],
        logger: loggerMock.create(),
      });

      assertHasDeletedTransforms(mockEntityDefinition, esClient);
      assertHasUpgradedDefinition(mockEntityDefinition, soClient, esClient);
    });
  });
});
