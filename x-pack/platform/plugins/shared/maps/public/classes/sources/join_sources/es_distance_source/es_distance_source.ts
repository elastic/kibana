/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection } from 'geojson';
import { i18n } from '@kbn/i18n';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { Query } from '@kbn/es-query';
import { ISearchSource } from '@kbn/data-plugin/public';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { AGG_TYPE, FIELD_ORIGIN, SOURCE_TYPES } from '../../../../../common/constants';
import { getJoinAggKey } from '../../../../../common/get_agg_key';
import { AbstractESAggSource } from '../../es_agg_source';
import type { BucketProperties } from '../../../../../common/elasticsearch_util';
import {
  DataFilters,
  ESDistanceSourceDescriptor,
  VectorSourceRequestMeta,
} from '../../../../../common/descriptor_types';
import { isValidStringConfig } from '../../../util/valid_string_config';
import { IJoinSource } from '../types';
import type { IESAggSource, ESAggsSourceSyncMeta } from '../../es_agg_source';
import { IField } from '../../../fields/field';
import { mergeExecutionContext } from '../../execution_context_utils';
import { processDistanceResponse } from './process_distance_response';
import { isSpatialSourceComplete } from '../is_spatial_source_complete';
import { getJoinMetricsRequestName } from '../i18n_utils';

export const DEFAULT_WITHIN_DISTANCE = 5;

type ESDistanceSourceSyncMeta = ESAggsSourceSyncMeta &
  Pick<ESDistanceSourceDescriptor, 'distance' | 'geoField'>;

export class ESDistanceSource extends AbstractESAggSource implements IJoinSource, IESAggSource {
  static type = SOURCE_TYPES.ES_DISTANCE_SOURCE;

  static createDescriptor(
    descriptor: Partial<ESDistanceSourceDescriptor>
  ): ESDistanceSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(descriptor.geoField)) {
      throw new Error('Cannot create an ESDistanceSource without a geoField property');
    }
    return {
      ...normalizedDescriptor,
      geoField: descriptor.geoField!,
      distance:
        typeof descriptor.distance === 'number' ? descriptor.distance : DEFAULT_WITHIN_DISTANCE,
      type: SOURCE_TYPES.ES_DISTANCE_SOURCE,
    };
  }

  readonly _descriptor: ESDistanceSourceDescriptor;

  constructor(descriptor: Partial<ESDistanceSourceDescriptor>) {
    const sourceDescriptor = ESDistanceSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  hasCompleteConfig(): boolean {
    return isSpatialSourceComplete(this._descriptor);
  }

  getOriginForField(): FIELD_ORIGIN {
    return FIELD_ORIGIN.JOIN;
  }

  getWhereQuery(): Query | undefined {
    return this._descriptor.whereQuery;
  }

  getAggKey(aggType: AGG_TYPE, fieldName?: string): string {
    return getJoinAggKey({
      aggType,
      aggFieldName: fieldName,
      rightSourceId: this._descriptor.id,
    });
  }

  async getJoinMetrics(
    requestMeta: VectorSourceRequestMeta,
    layerName: string,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters,
    featureCollection?: FeatureCollection
  ) {
    if (featureCollection === undefined) {
      throw new Error(
        i18n.translate('xpack.maps.esDistanceSource.noFeatureCollectionMsg', {
          defaultMessage: `Unable to perform distance join, features not provided. To enable distance join, select 'Limit results' in 'Scaling'`,
        })
      );
    }

    if (!this.hasCompleteConfig()) {
      return {
        joinMetrics: new Map<string, BucketProperties>(),
        warnings: [],
      };
    }

    const distance = `${this._descriptor.distance}km`;
    let hasFilters = false;
    const filters: Record<string, unknown> = {};
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      if (feature.geometry.type === 'Point' && feature?.properties?._id) {
        filters[feature.properties._id] = {
          geo_distance: {
            distance,
            [this._descriptor.geoField]: feature.geometry.coordinates,
          },
        };
        if (!hasFilters) {
          hasFilters = true;
        }
      }
    }

    if (!hasFilters) {
      return {
        joinMetrics: new Map<string, BucketProperties>(),
        warnings: [],
      };
    }

    const indexPattern = await this.getIndexPattern();
    const searchSource: ISearchSource = await this.makeSearchSource(requestMeta, 0);
    searchSource.setField('trackTotalHits', false);
    searchSource.setField('aggs', {
      distance: {
        filters: {
          filters,
        },
        aggs: this.getValueAggsDsl(indexPattern),
      },
    });
    const warnings: SearchResponseWarning[] = [];
    const rawEsData = await this._runEsQuery({
      requestId: this.getId(),
      requestName: getJoinMetricsRequestName(layerName),
      searchSource,
      registerCancelCallback,
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_distance_source:distance_join_request' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
      onWarning: (warning: SearchResponseWarning) => {
        warnings.push(warning);
      },
    });

    return {
      joinMetrics: processDistanceResponse(rawEsData, this.getAggKey(AGG_TYPE.COUNT)),
      warnings,
    };
  }

  isFilterByMapBounds(): boolean {
    return false;
  }

  getSyncMeta(dataFilters: DataFilters): ESDistanceSourceSyncMeta {
    return {
      ...super.getSyncMeta(dataFilters),
      distance: this._descriptor.distance,
      geoField: this._descriptor.geoField,
    };
  }

  getRightFields(): IField[] {
    return this.getMetricFields();
  }
}
