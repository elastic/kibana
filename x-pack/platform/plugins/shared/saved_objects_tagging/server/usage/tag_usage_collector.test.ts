/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { createTagUsageCollector } from './tag_usage_collector';
import { tagUsageCollectorSchema } from './schema';
import * as fetchTagUsageDataModule from './fetch_tag_usage_data';

describe('createTagUsageCollector', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('creates usage collector with expected type and schema', () => {
    const usageCollection = createUsageCollectionSetupMock();
    const getKibanaIndices = jest.fn().mockResolvedValue(['.kibana']);

    createTagUsageCollector({ usageCollection, getKibanaIndices });

    expect(usageCollection.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollection.makeUsageCollector).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'saved_objects_tagging',
        isReady: expect.any(Function),
        schema: tagUsageCollectorSchema,
        fetch: expect.any(Function),
      })
    );
  });

  it('fetches usage data with indices returned by getKibanaIndices', async () => {
    const usageCollection = createUsageCollectionSetupMock();
    const getKibanaIndices = jest.fn().mockResolvedValue(['.kibana_1', '.kibana_2']);
    const fetchContext = createCollectorFetchContextMock();
    const usageData = { usedTags: 4, taggedObjects: 5, types: {} };
    const fetchTagUsageDataMock = jest
      .spyOn(fetchTagUsageDataModule, 'fetchTagUsageData')
      .mockResolvedValue(usageData);

    createTagUsageCollector({ usageCollection, getKibanaIndices });
    const collector = usageCollection.makeUsageCollector.mock.results[0].value;

    await expect(collector.fetch(fetchContext)).resolves.toEqual(usageData);
    expect(getKibanaIndices).toHaveBeenCalledTimes(1);
    expect(fetchTagUsageDataMock).toHaveBeenCalledWith({
      esClient: fetchContext.esClient,
      kibanaIndices: ['.kibana_1', '.kibana_2'],
    });
  });
});
