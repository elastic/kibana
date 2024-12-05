/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESGeoLineSource } from './es_geo_line_source';
import { DataRequest } from '../../util/data_request';

describe('getSourceStatus', () => {
  const geoLineSource = new ESGeoLineSource({
    indexPatternId: 'myindex',
    geoField: 'myGeoField',
    splitField: 'mySplitField',
    sortField: 'mySortField',
  });

  it('Should not show results trimmed icon when number of entities is not trimmed and all tracks are complete', () => {
    const sourceDataRequest = new DataRequest({
      data: {},
      dataId: 'source',
      dataRequestMeta: {
        areResultsTrimmed: false,
        areEntitiesTrimmed: false,
        entityCount: 70,
        numTrimmedTracks: 0,
        totalEntities: 70,
      },
    });
    const { tooltipContent, areResultsTrimmed } = geoLineSource.getSourceStatus(sourceDataRequest);
    expect(areResultsTrimmed).toBe(false);
    expect(tooltipContent).toBe('Found 70 tracks.');
  });

  it('Should show results trimmed icon and message when number of entities are trimmed', () => {
    const sourceDataRequest = new DataRequest({
      data: {},
      dataId: 'source',
      dataRequestMeta: {
        areResultsTrimmed: true,
        areEntitiesTrimmed: true,
        entityCount: 1000,
        numTrimmedTracks: 0,
        totalEntities: 5000,
      },
    });
    const { tooltipContent, areResultsTrimmed } = geoLineSource.getSourceStatus(sourceDataRequest);
    expect(areResultsTrimmed).toBe(true);
    expect(tooltipContent).toBe('Results limited to first 1,000 tracks of ~5,000.');
  });

  it('Should show results trimmed icon and message when tracks are trimmed', () => {
    const sourceDataRequest = new DataRequest({
      data: {},
      dataId: 'source',
      dataRequestMeta: {
        areResultsTrimmed: false,
        areEntitiesTrimmed: false,
        entityCount: 70,
        numTrimmedTracks: 10,
        totalEntities: 70,
      },
    });
    const { tooltipContent, areResultsTrimmed } = geoLineSource.getSourceStatus(sourceDataRequest);
    expect(areResultsTrimmed).toBe(true);
    expect(tooltipContent).toBe('Found 70 tracks. 10 of 70 tracks are incomplete.');
  });

  it('Should show results trimmed icon and message when number of entities are trimmed. and tracks are trimmed', () => {
    const sourceDataRequest = new DataRequest({
      data: {},
      dataId: 'source',
      dataRequestMeta: {
        areResultsTrimmed: true,
        areEntitiesTrimmed: true,
        entityCount: 1000,
        numTrimmedTracks: 10,
        totalEntities: 5000,
      },
    });
    const { tooltipContent, areResultsTrimmed } = geoLineSource.getSourceStatus(sourceDataRequest);
    expect(areResultsTrimmed).toBe(true);
    expect(tooltipContent).toBe(
      'Results limited to first 1,000 tracks of ~5,000. 10 of 1,000 tracks are incomplete.'
    );
  });
});
