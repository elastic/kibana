/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import {
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';

import { getLibraryCatalogSource, registerLibraryUsageCollector } from './usage_collector';
import { DEFAULT_LIBRARY_REGISTRY_URL } from '../library_fetcher';

const TTL_MS = 600_000;

describe('getLibraryCatalogSource', () => {
  it.each([
    ['default_registry', 'nothing is configured', {}],
    [
      'default_registry',
      'the default registry is set explicitly',
      { registryUrl: `${DEFAULT_LIBRARY_REGISTRY_URL}/` },
    ],
    ['custom_registry', 'another registry is set', { registryUrl: 'https://mirror.acme.test/v1' }],
    ['bundle', 'a bundle path is set', { bundlePath: '/opt/acme/library' }],
  ])('returns %s when %s', (source, _, config) => {
    expect(getLibraryCatalogSource({ ttlMs: TTL_MS, ...config })).toBe(source);
  });
});

describe('registerLibraryUsageCollector', () => {
  const setup = (library = { ttlMs: TTL_MS, registryUrl: 'https://mirror.acme.test/v1' }) => {
    const usageCollection = createUsageCollectionSetupMock();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    const globalUiSettings = { get: jest.fn().mockResolvedValue(true) };
    coreStart.uiSettings.globalAsScopedToClient.mockReturnValue(
      globalUiSettings as unknown as ReturnType<typeof coreStart.uiSettings.globalAsScopedToClient>
    );

    registerLibraryUsageCollector({
      usageCollection,
      libraryConfig: library,
      getStartServices: coreSetup.getStartServices,
    });
    const collector = usageCollection.makeUsageCollector.mock.results[0].value;

    return { usageCollection, coreStart, globalUiSettings, collector };
  };

  it('registers the workflows_library collector', () => {
    const { usageCollection } = setup();

    expect(usageCollection.makeUsageCollector).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workflows_library' })
    );
    expect(usageCollection.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('reports the library setting and the catalog source, never the registry URL', async () => {
    const { coreStart, globalUiSettings, collector } = setup();
    const fetchContext = createCollectorFetchContextMock();

    const usage = await collector.fetch(fetchContext);

    expect(coreStart.uiSettings.globalAsScopedToClient).toHaveBeenCalledWith(fetchContext.soClient);
    expect(globalUiSettings.get).toHaveBeenCalledWith(WORKFLOWS_LIBRARY_ENABLED_SETTING_ID);
    expect(usage).toEqual({ enabled: true, source: 'custom_registry' });
  });
});
