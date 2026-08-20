/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../..';

import { deleteComponentTemplates } from './remove';

describe('deleteComponentTemplates', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    appContextService.start(createAppContextStartContractMock());
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-mine@package',
          component_template: { _meta: { package: { name: 'mine' } }, template: {} },
        },
      ],
    } as never);
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('deletes a component template owned by this package', async () => {
    await deleteComponentTemplates(esClient, ['logs-mine@package'], { packageName: 'mine' });

    expect(esClient.cluster.deleteComponentTemplate).toHaveBeenCalledWith(
      { name: 'logs-mine@package' },
      { ignore: [404] }
    );
  });

  it('skips a component template owned by another package', async () => {
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-mine@package',
          component_template: { _meta: { package: { name: 'theirs' } }, template: {} },
        },
      ],
    } as never);

    await deleteComponentTemplates(esClient, ['logs-mine@package'], { packageName: 'mine' });

    expect(esClient.cluster.deleteComponentTemplate).not.toHaveBeenCalled();
  });

  it('skips a component template with no package owner', async () => {
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-mine@package',
          component_template: { template: {} },
        },
      ],
    } as never);

    await deleteComponentTemplates(esClient, ['logs-mine@package'], { packageName: 'mine' });

    expect(esClient.cluster.deleteComponentTemplate).not.toHaveBeenCalled();
  });
});
