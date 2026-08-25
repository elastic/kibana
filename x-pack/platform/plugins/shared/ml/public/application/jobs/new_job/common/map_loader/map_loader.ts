/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ES_GEO_FIELD_TYPE, LayerDescriptor } from '@kbn/maps-plugin/common';
import type { CreateLayerDescriptorParams, MapsStartApi } from '@kbn/maps-plugin/public';
import type { Query } from '@kbn/es-query';
import type { Field, SplitField } from '@kbn/ml-anomaly-utils';
import { ChartLoader } from '../chart_loader';
import type { MlApi } from '../../../../services/ml_api_service';

const eq = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

export class MapLoader extends ChartLoader {
  private _getMapData;

  constructor(
    mlApi: MlApi,
    indexPattern: DataView,
    query: object,
    mapsPlugin: MapsStartApi | undefined
  ) {
    super(mlApi, indexPattern, query);

    this._getMapData = mapsPlugin
      ? memoizeOne(mapsPlugin.createLayerDescriptors.createESSearchSourceLayerDescriptor, eq)
      : null;
  }

  async getMapLayersForGeoJob(
    geoField: Field,
    splitField: SplitField,
    fieldValues: string[],
    savedSearchQuery?: Query
  ) {
    const layerList: LayerDescriptor[] = [];
    if (this._dataView.id !== undefined && geoField) {
      const { query } = savedSearchQuery ?? {};
      const queryString =
        fieldValues.length && splitField
          ? `${splitField.name}:${fieldValues[0]} ${query ? `and ${query}` : ''}`
          : `${query ? query : ''}`;

      const params: CreateLayerDescriptorParams = {
        indexPatternId: this._dataView.id,
        geoFieldName: geoField.name,
        geoFieldType: geoField.type as unknown as ES_GEO_FIELD_TYPE,
        query: { query: queryString, language: 'kuery' },
      };

      const searchLayerDescriptor = this._getMapData ? await this._getMapData(params) : null;

      if (searchLayerDescriptor) {
        layerList.push(searchLayerDescriptor);
      }
    }
    return layerList;
  }
}
