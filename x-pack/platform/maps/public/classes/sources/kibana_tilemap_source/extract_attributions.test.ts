/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractAttributions } from './extract_attributions';

test('Should extract attributions from markdown', () => {
  const markdown =
    '[OpenStreetMap contributors](https://www.openstreetmap.org/copyright)|[OpenMapTiles](https://openmaptiles.org)|[Elastic Maps Service](https://www.elastic.co/elastic-maps-service)';
  const attributions = extractAttributions(markdown);
  expect(attributions).toEqual([
    {
      label: 'OpenStreetMap contributors',
      url: 'https://www.openstreetmap.org/copyright',
    },
    {
      label: 'OpenMapTiles',
      url: 'https://openmaptiles.org',
    },
    {
      label: 'Elastic Maps Service',
      url: 'https://www.elastic.co/elastic-maps-service',
    },
  ]);
});
