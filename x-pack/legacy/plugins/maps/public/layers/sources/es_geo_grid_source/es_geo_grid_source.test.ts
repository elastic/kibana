/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('../../../kibana_services', () => {});
jest.mock('ui/new_platform');

import { ESGeoGridSource } from './es_geo_grid_source';
import { AGG_TYPE, ES_GEO_GRID, GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';

describe('ESGeoGridSource', () => {
  const metricExamples = [
    {
      type: AGG_TYPE.SUM,
      field: 'myFieldGettingSummed',
      label: 'my custom label',
    },
    {
      // metric config is invalid beause field is missing
      type: AGG_TYPE.MAX,
    },
    {
      // metric config is valid because "count" metric does not need to provide field
      type: AGG_TYPE.COUNT,
      label: '', // should ignore empty label fields
    },
  ];

  const geogridSource = new ESGeoGridSource(
    {
      id: 'foobar',
      indexPatternId: 'fooIp',
      geoField: 'bar',
      metrics: metricExamples,
      resolution: GRID_RESOLUTION.COARSE,
      type: ES_GEO_GRID,
      requestType: RENDER_AS.HEATMAP,
    },
    {}
  );

  it('should echo gridResoltuion', () => {
    expect(geogridSource.getGridResolution()).toBe(GRID_RESOLUTION.COARSE);
  });

  it('should clamp geo-grid derived zoom to max geotile level supported by ES', () => {
    expect(geogridSource.getGeoGridPrecision(29)).toBe(29);
  });
});
