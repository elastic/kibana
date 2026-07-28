/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-plugin/common';
import { createMapStore } from '../reducers/store';
import { initializeDataViews } from './initialize_data_views';
import { createLayerDescriptor } from '../classes/sources/es_search_source';
import { ES_GEO_FIELD_TYPE } from '../../common/constants';
import { skip } from 'rxjs';

jest.mock('../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
    getMapsCapabilities() {
      return { save: true };
    },
    getShowMapsInspectorAdapter() {
      return false;
    },
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
        },
      };
    },
  };
});
jest.mock('../index_pattern_util', () => {
  return {
    getIndexPatternsFromIds: async (ids: string[]) => {
      return ids.length
        ? ids.map(
            (id) =>
              ({
                id,
              } as unknown as DataView)
          )
        : [];
    },
  };
});

describe('dataViews$', () => {
  const onEmitMock = jest.fn();

  beforeEach(() => {
    onEmitMock.mockReset();
  });

  test('Should emit when data view added', (done) => {
    const dataViewApi = initializeDataViews(createMapStore());
    dataViewApi.dataViews$.pipe(skip(1)).subscribe((dataViews) => {
      expect(dataViews).toEqual([
        {
          id: '1234',
        },
      ]);
      done();
    });

    dataViewApi.setLayerList([
      createLayerDescriptor({
        indexPatternId: '1234',
        geoFieldName: 'location',
        geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
      }),
    ]);
  });

  test('Should emit when data view removed', (done) => {
    const dataViewApi = initializeDataViews(createMapStore());
    dataViewApi
      .setLayerList([
        createLayerDescriptor({
          indexPatternId: '1234',
          geoFieldName: 'location',
          geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
        }),
      ])
      .then(() => {
        dataViewApi.dataViews$.pipe(skip(1)).subscribe((dataViews) => {
          expect(dataViews).toEqual([]);
          done();
        });

        dataViewApi.setLayerList([]);
      });
  });

  test('Should not emit when data view ids do not change', async () => {
    const dataViewApi = initializeDataViews(createMapStore());
    await dataViewApi.setLayerList([
      createLayerDescriptor({
        indexPatternId: '1234',
        geoFieldName: 'location',
        geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
      }),
      createLayerDescriptor({
        indexPatternId: '4567',
        geoFieldName: 'location',
        geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
      }),
    ]);

    const subscription = dataViewApi.dataViews$.pipe(skip(1)).subscribe(onEmitMock);

    await dataViewApi.setLayerList([
      createLayerDescriptor({
        indexPatternId: '4567',
        geoFieldName: 'location',
        geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
      }),
      createLayerDescriptor({
        indexPatternId: '1234',
        geoFieldName: 'location',
        geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
      }),
    ]);
    expect(onEmitMock).not.toHaveBeenCalled();

    subscription.unsubscribe();
  });
});
