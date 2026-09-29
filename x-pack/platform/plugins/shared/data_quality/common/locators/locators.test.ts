/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { DatasetQualityLocatorDefinition } from './dataset_quality_locator';
import type { DataQualityLocatorDependencies } from './types';

const createMockLocator = (id: string, section: string) => ({
  id,
  navigate: vi.fn(),
  getRedirectUrl: vi.fn(),
  getLocation: vi.fn().mockReturnValue({ app: id, path: `/${section}`, state: {} }),
  getUrl: vi.fn(),
  navigateSync: vi.fn(),
  useUrl: vi.fn(),
  telemetry: vi.fn(),
  inject: vi.fn(),
  extract: vi.fn(),
  migrations: vi.fn(),
});

const setup = async () => {
  const dep: DataQualityLocatorDependencies = {
    useHash: false,
    managementLocator: createMockLocator('management', 'data/data_quality'),
  };

  const datasetQualityLocator = new DatasetQualityLocatorDefinition(dep);

  return {
    datasetQualityLocator,
  };
};

describe('Data quality Locators', () => {
  const timeRange = { to: 'now', from: 'now-30m' };

  describe('Dataset Quality Locator', () => {
    it('should create a link with correct path and no state', async () => {
      const { datasetQualityLocator } = await setup();
      const location = await datasetQualityLocator.getLocation({});

      expect(location).toMatchObject({
        app: '',
        path: 'management/data/data_quality?pageState=(v:1)',
        state: {},
      });
    });

    it('should create a link with correct timeRange', async () => {
      const refresh = {
        pause: false,
        value: 0,
      };
      const locatorParams = {
        filters: {
          timeRange: {
            ...timeRange,
            refresh,
          },
        },
      };
      const { datasetQualityLocator } = await setup();

      const location = await datasetQualityLocator.getLocation(locatorParams);

      expect(location).toMatchObject({
        app: '',
        path: 'management/data/data_quality?pageState=(filters:(timeRange:(from:now-30m,refresh:(pause:!f,value:0),to:now)),v:1)',
        state: {},
      });
    });
  });
});
