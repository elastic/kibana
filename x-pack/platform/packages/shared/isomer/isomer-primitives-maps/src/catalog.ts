/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';
import { mapCanonicalExample } from './examples';

export const mapPrimitiveCatalogEntry = {
  type: 'map',
  purpose:
    'Shows a geographic distribution of places, geo-grid buckets, choropleth regions, or flows on a map.',
  useWhen: [
    'The answer is where things happened: cities, IPs resolved to coordinates, or geotile/geohex aggregation buckets.',
    'A choropleth of countries or US states, or point-to-point arcs, is the point of the view.',
  ],
  avoidWhen: [
    'There is no geography — ranked entities belong in `table` or `entityList`.',
    'The topology is who-connects-to-whom rather than where. Use `graph`.',
    'More than ~150 distinct places, ~2000 geo-grid cells, ~250 regions, or ~100 arcs. Aggregate first.',
    'Indexed lines or polygons. This node does not carry inline GeoJSON geometry.',
    'Never set `basemap`. A host stamps that field immediately before a PNG render.',
  ],
  example: mapCanonicalExample,
} satisfies PrimitiveCatalogEntry;
