/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import { MapSettingsCollector } from './map_settings_collector';
import type { StoredMapAttributes } from '../../server';
import { transformMapAttributesOut } from '../content_management/transform_map_attributes_out';
import type { SavedObject } from '@kbn/core/server';

const expecteds = [
  {
    customIconsCount: 0,
  },
  {
    customIconsCount: 0,
  },
  {
    customIconsCount: 0,
  },
  {
    customIconsCount: 1,
  },
  {
    customIconsCount: 3,
    autoFitToDataBounds: true,
  },
];

const testsToRun = mapSavedObjects.map(
  (savedObject: SavedObject<StoredMapAttributes>, index: number) => {
    return [
      transformMapAttributesOut(savedObject.attributes, (targetName: string) =>
        savedObject.references.find(({ name }) => name === targetName)
      ),
      expecteds[index],
    ] as const;
  }
);

describe.each(testsToRun)('MapSettingsCollector %#', (attributes, expected) => {
  const statsCollector = new MapSettingsCollector(attributes);
  test('getCustomIconsCount', () => {
    expect(statsCollector.getCustomIconsCount()).toBe(expected.customIconsCount);
  });
});
