/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { OWNERS } from '../../common/constants';
import { createExtendedFieldsIndicesOnStartup } from './create_extended_fields_indices_on_startup';

describe('createExtendedFieldsIndicesOnStartup', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();

    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 0,
      aggregations: {
        spaces: {
          buckets: [{ key: 'default' }, { key: 'space-a' }],
        },
      },
    });

    esClient.indices.exists.mockResolvedValue(false);
    esClient.indices.create.mockResolvedValue({ acknowledged: true, shards_acknowledged: true });
  });

  it('creates one extended-fields index per owner and per space', async () => {
    await createExtendedFieldsIndicesOnStartup({
      esClient,
      logger,
      savedObjectsClient,
    });

    expect(esClient.indices.create).toHaveBeenCalledTimes(OWNERS.length * 2);
    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.internal.cases-extended-fields.securitysolution-default',
      })
    );
    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.internal.cases-extended-fields.observability-space-a',
      })
    );
  });

  it('skips index creation when index already exists', async () => {
    esClient.indices.exists.mockResolvedValue(true);

    await createExtendedFieldsIndicesOnStartup({
      esClient,
      logger,
      savedObjectsClient,
    });

    expect(esClient.indices.create).not.toHaveBeenCalled();
  });
});
