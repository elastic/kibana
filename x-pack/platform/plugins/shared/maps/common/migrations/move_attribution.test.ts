/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { moveAttribution } from './move_attribution';
import { LayerDescriptor } from '../descriptor_types';

test('Should handle missing layerListJSON attribute', () => {
  const attributes = {
    title: 'my map',
  };
  expect(moveAttribution({ attributes })).toEqual({
    title: 'my map',
  });
});

test('Should migrate source attribution to layer attribution', () => {
  const layerListJSON = JSON.stringify([
    {
      sourceDescriptor: {
        attributionText: 'myLabel',
        attributionUrl: 'myUrl',
        id: 'mySourceId',
      },
    },
  ] as unknown as LayerDescriptor[]);

  const attributes = {
    title: 'my map',
    layerListJSON,
  };

  const { layerListJSON: migratedLayerListJSON } = moveAttribution({ attributes });
  const migratedLayerList = JSON.parse(migratedLayerListJSON!);
  expect(migratedLayerList).toEqual([
    {
      attribution: { label: 'myLabel', url: 'myUrl' },
      sourceDescriptor: { id: 'mySourceId' },
    },
  ]);
});

test('Should not add attribution to layer when source does not provide attribution', () => {
  const layerListJSON = JSON.stringify([
    {
      sourceDescriptor: {
        id: 'mySourceId',
      },
    },
  ] as unknown as LayerDescriptor[]);

  const attributes = {
    title: 'my map',
    layerListJSON,
  };

  const { layerListJSON: migratedLayerListJSON } = moveAttribution({ attributes });
  const migratedLayerList = JSON.parse(migratedLayerListJSON!);
  expect(migratedLayerList).toEqual([
    {
      sourceDescriptor: { id: 'mySourceId' },
    },
  ]);
});
