/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { ElasticsearchAssetType } from '../../../../../common/types';

import { assertComponentTemplatesMutable } from './component_templates';
import { DatasetOwnershipConflictError } from './errors';

const name = 'logs-mine.access@namespace.production';

describe('assertComponentTemplatesMutable', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    soClient.bulkGet.mockResolvedValue({ saved_objects: [] } as never);
    soClient.find.mockResolvedValue({ saved_objects: [] } as never);
  });

  it('allows a component template that does not exist yet', async () => {
    esClient.cluster.getComponentTemplate.mockRejectedValue({ meta: { statusCode: 404 } });

    await expect(
      assertComponentTemplatesMutable({
        esClient,
        soClient,
        packageName: 'mine',
        names: [name],
      })
    ).resolves.toBeUndefined();
  });

  it('allows a component template corroborated by _meta and installed_es', async () => {
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name,
          component_template: { _meta: { package: { name: 'mine' } }, template: {} },
        },
      ],
    } as never);

    await expect(
      assertComponentTemplatesMutable({
        esClient,
        soClient,
        packageName: 'mine',
        names: [name],
        installedEs: [{ id: name, type: ElasticsearchAssetType.componentTemplate }],
      })
    ).resolves.toBeUndefined();
  });

  it('allows an ownerless component template tracked in installed_es', async () => {
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name,
          component_template: { template: {} },
        },
      ],
    } as never);

    await expect(
      assertComponentTemplatesMutable({
        esClient,
        soClient,
        packageName: 'mine',
        names: [name],
        installedEs: [{ id: name, type: ElasticsearchAssetType.componentTemplate }],
      })
    ).resolves.toBeUndefined();
  });

  it('allows a foreign component template covered by an active adoption claim', async () => {
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name,
          component_template: { _meta: { package: { name: 'theirs' } }, template: {} },
        },
      ],
    } as never);
    soClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'logs-mine.access',
          attributes: { package_name: 'mine', origin: 'adoption', status: 'active' },
        },
      ],
    } as never);

    await expect(
      assertComponentTemplatesMutable({
        esClient,
        soClient,
        packageName: 'mine',
        names: [name],
      })
    ).resolves.toBeUndefined();
  });

  it('rejects a component template that is not corroborated and not adopted', async () => {
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name,
          component_template: { _meta: { package: { name: 'theirs' } }, template: {} },
        },
      ],
    } as never);

    await expect(
      assertComponentTemplatesMutable({
        esClient,
        soClient,
        packageName: 'mine',
        names: [name],
        installedEs: [],
      })
    ).rejects.toBeInstanceOf(DatasetOwnershipConflictError);
  });

  it('rejects a self-attributed template that is not in installed_es', async () => {
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name,
          component_template: { _meta: { package: { name: 'mine' } }, template: {} },
        },
      ],
    } as never);

    await expect(
      assertComponentTemplatesMutable({
        esClient,
        soClient,
        packageName: 'mine',
        names: [name],
        installedEs: [],
      })
    ).rejects.toBeInstanceOf(DatasetOwnershipConflictError);
  });
});
