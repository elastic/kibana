/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Sha256 } from '@kbn/crypto-browser';
import { lastValueFrom } from 'rxjs';
import { tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import {
  getESQLAdHocDataview,
  getESQLQueryColumnsRaw,
  getIndexPatternFromESQLQuery,
  getLimitFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
  getStartEndParams,
  hasStartEndParams,
} from '@kbn/esql-utils';
import { buildEsQuery, getTimeZoneFromSettings } from '@kbn/es-query';
import type { Filter, Query } from '@kbn/es-query';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { getEsQueryConfig } from '@kbn/data-service/src/es_query';
import { getTime } from '@kbn/data-plugin/public';
import type { GeoJsonProperties } from 'geojson';
import { asyncMap } from '@kbn/std';
import {
  FIELD_ORIGIN,
  GEOJSON_FEATURE_ID_PROPERTY_NAME,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import type {
  ESQLSourceDescriptor,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { createExtentFilter } from '../../../../common/elasticsearch_util';
import type { DataRequest } from '../../util/data_request';
import { isValidStringConfig } from '../../util/valid_string_config';
import type { SourceEditorArgs } from '../source';
import { AbstractVectorSource, getLayerFeaturesRequestName } from '../vector_source';
import type { IVectorSource, GeoJsonWithMeta, SourceStatus } from '../vector_source';
import type { IESSource } from '../es_source';
import type { IField } from '../../fields/field';
import { getData, getHttp, getIndexPatternService, getUiSettings } from '../../../kibana_services';
import { convertToGeoJson } from './convert_to_geojson';
import { isGeometryColumn, ESQL_GEO_SHAPE_TYPE, getFields } from './esql_utils';
import { UpdateSourceEditor } from './update_source_editor';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
import { ESQLField } from '../../fields/esql_field';

type ESQLSourceSyncMeta = Pick<
  ESQLSourceDescriptor,
  'dateField' | 'esql' | 'geoField' | 'narrowByMapBounds' | 'narrowByGlobalTime'
>;

export const sourceTitle = i18n.translate('xpack.maps.source.esqlSearchTitle', {
  defaultMessage: 'ES|QL',
});

export type NormalizedESQLSourceDescriptor = ESQLSourceDescriptor &
  Required<
    Pick<
      ESQLSourceDescriptor,
      'narrowByGlobalSearch' | 'narrowByGlobalTime' | 'narrowByMapBounds' | 'applyForceRefresh'
    >
  >;

export class ESQLSource
  extends AbstractVectorSource
  implements
    IVectorSource,
    Pick<
      IESSource,
      'getIndexPattern' | 'getIndexPatternId' | 'getGeoFieldName' | 'getProjectRouting'
    >
{
  readonly _descriptor: NormalizedESQLSourceDescriptor;
  private _dataViewId: string | undefined;

  static createDescriptor(
    descriptor: Partial<ESQLSourceDescriptor>
  ): NormalizedESQLSourceDescriptor {
    if (!isValidStringConfig(descriptor.esql)) {
      throw new Error('Cannot create ESQLSourceDescriptor when esql is not provided');
    }

    return {
      ...descriptor,
      id: isValidStringConfig(descriptor.id) ? descriptor.id! : uuidv4(),
      type: SOURCE_TYPES.ESQL,
      esql: descriptor.esql!,
      narrowByGlobalSearch:
        typeof descriptor.narrowByGlobalSearch !== 'undefined'
          ? descriptor.narrowByGlobalSearch
          : true,
      narrowByGlobalTime:
        typeof descriptor.narrowByGlobalTime !== 'undefined'
          ? descriptor.narrowByGlobalTime
          : descriptor.dateField !== 'undefined',
      narrowByMapBounds:
        typeof descriptor.narrowByMapBounds !== 'undefined'
          ? descriptor.narrowByMapBounds
          : descriptor.geoField !== 'undefined',
      applyForceRefresh:
        typeof descriptor.applyForceRefresh !== 'undefined' ? descriptor.applyForceRefresh : true,
    };
  }

  constructor(partialDescriptor: Partial<ESQLSourceDescriptor>) {
    const descriptor = ESQLSource.createDescriptor(partialDescriptor);
    super(descriptor);
    this._descriptor = descriptor;
  }

  private _getRequestId(): string {
    return this._descriptor.id;
  }

  async getDisplayName() {
    const pattern: string = getIndexPatternFromESQLQuery(this._descriptor.esql);
    return pattern ? pattern : 'ES|QL';
  }

  hasTooltipProperties() {
    return true;
  }

  getTooltipProperties = async (mbProperties: GeoJsonProperties): Promise<ITooltipProperty[]> => {
    if (!mbProperties) return [];

    const keys = Object.keys(mbProperties).filter(
      (key) => key !== GEOJSON_FEATURE_ID_PROPERTY_NAME
    );

    return asyncMap(keys, async (key) => {
      return await this.getFieldByName(key).createTooltipProperty(mbProperties[key]);
    });
  };

  async supportsFitToBounds(): Promise<boolean> {
    return false;
  }

  getInspectorRequestIds() {
    return [this._getRequestId()];
  }

  isQueryAware() {
    return true;
  }

  getApplyGlobalQuery() {
    return this._descriptor.narrowByGlobalSearch || hasStartEndParams(this._descriptor.esql);
  }

  async isTimeAware() {
    return this._descriptor.narrowByGlobalTime || hasStartEndParams(this._descriptor.esql);
  }

  getApplyGlobalTime() {
    return this._descriptor.narrowByGlobalTime;
  }

  getApplyForceRefresh() {
    return this._descriptor.applyForceRefresh;
  }

  isFilterByMapBounds() {
    return this._descriptor.narrowByMapBounds;
  }

  async getSupportedShapeTypes() {
    const columns = await getESQLQueryColumnsRaw({
      esqlQuery: this._descriptor.esql,
      search: getData().search.search,
      timeRange: getData().query.timefilter.timefilter.getAbsoluteTime(),
    });
    const geoColumn = columns.find(isGeometryColumn);
    return geoColumn?.type === ESQL_GEO_SHAPE_TYPE
      ? [VECTOR_SHAPE_TYPE.POINT, VECTOR_SHAPE_TYPE.LINE, VECTOR_SHAPE_TYPE.POLYGON]
      : [VECTOR_SHAPE_TYPE.POINT];
  }

  supportsJoins() {
    return false; // Joins will be part of ESQL statement and not client side join
  }

  async getGeoJsonWithMeta(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    const limit = getLimitFromESQLQuery(this._descriptor.esql);
    const params: ESQLSearchParams = {
      query: this._descriptor.esql,
      dropNullColumns: true,
    };

    const query: Query[] = [];
    const filters: Filter[] = [];
    if (this._descriptor.narrowByGlobalSearch) {
      if (requestMeta.query) {
        query.push(requestMeta.query);
      }
      if (requestMeta.embeddableSearchContext?.query) {
        query.push(requestMeta.embeddableSearchContext.query);
      }
      filters.push(...requestMeta.filters);
      if (requestMeta.embeddableSearchContext) {
        filters.push(...requestMeta.embeddableSearchContext.filters);
      }
    }

    if (this._descriptor.narrowByMapBounds && requestMeta.buffer) {
      if (!this._descriptor.geoField) {
        throw new Error(
          i18n.translate('xpack.maps.source.esql.noGeoFieldError', {
            defaultMessage:
              'Unable to narrow ES|QL statement by visible map area, geospatial field is not provided',
          })
        );
      }
      const extentFilter = createExtentFilter(requestMeta.buffer, [this._descriptor.geoField]);
      filters.push(extentFilter);
    }

    const timeRange = requestMeta.timeslice
      ? {
          from: new Date(requestMeta.timeslice.from).toISOString(),
          to: new Date(requestMeta.timeslice.to).toISOString(),
          mode: 'absolute' as 'absolute',
        }
      : requestMeta.timeFilters;

    if (requestMeta.applyGlobalTime) {
      if (!this._descriptor.dateField) {
        throw new Error(
          i18n.translate('xpack.maps.source.esql.noDateFieldError', {
            defaultMessage:
              'Unable to narrow ES|QL statement by global time, date field is not provided',
          })
        );
      }
      const timeFilter = getTime(undefined, timeRange, {
        fieldName: this._descriptor.dateField,
      });

      if (timeFilter) {
        filters.push(timeFilter);
      }
    }

    const namedParams = getStartEndParams(this._descriptor.esql, timeRange);
    if (namedParams.length) {
      params.params = namedParams;
    }

    const esQueryConfigs = getEsQueryConfig(getUiSettings());

    params.filter = buildEsQuery(undefined, query, filters, esQueryConfigs);
    params.time_zone = esQueryConfigs.dateFormatTZ
      ? getTimeZoneFromSettings(esQueryConfigs.dateFormatTZ)
      : 'UTC';

    const requestResponder = inspectorAdapters.requests!.start(
      getLayerFeaturesRequestName(layerName),
      {
        id: this._getRequestId(),
      }
    );
    requestResponder.json(params);

    const { rawResponse, requestParams } = await lastValueFrom(
      getData()
        .search.search(
          { params },
          {
            strategy: 'esql',
            projectRouting: requestMeta.projectRouting,
          }
        )
        .pipe(
          tap({
            error(error) {
              requestResponder.error({
                json: 'attributes' in error ? error.attributes : { message: error.message },
              });
            },
          })
        )
    );

    requestResponder.ok({ json: rawResponse, requestParams });

    const esqlSearchResponse = rawResponse as unknown as ESQLSearchResponse;
    const resultsCount = esqlSearchResponse.values.length;
    return {
      data: convertToGeoJson(esqlSearchResponse),
      meta: {
        resultsCount,
        areResultsTrimmed: resultsCount >= limit,
      },
    };
  }

  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus {
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;
    if (!meta) {
      // no tooltip content needed when there is no feature collection or meta
      return {
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    if (meta.areResultsTrimmed) {
      return {
        tooltipContent: i18n.translate('xpack.maps.esqlSearch.resultsTrimmedMsg', {
          defaultMessage: `Results limited to first {count} rows.`,
          values: { count: meta.resultsCount?.toLocaleString() },
        }),
        areResultsTrimmed: true,
      };
    }

    return {
      tooltipContent: i18n.translate('xpack.maps.esqlSearch.rowCountMsg', {
        defaultMessage: `Found {count} rows.`,
        values: { count: meta.resultsCount?.toLocaleString() },
      }),
      areResultsTrimmed: false,
    };
  }

  getFieldByName(fieldName: string): IField {
    return new ESQLField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  async getFields() {
    const columns = await getESQLQueryColumnsRaw({
      esqlQuery: this.getESQL(),
      search: getData().search.search,
      timeRange: getData().query.timefilter.timefilter.getAbsoluteTime(),
    });
    return columns.map(({ name }) => this.getFieldByName(name));
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    return (
      <UpdateSourceEditor
        onChange={onChange}
        sourceDescriptor={this._descriptor}
        getDataViewFields={this._getDataViewFields}
      />
    );
  }

  getSyncMeta(): ESQLSourceSyncMeta {
    return {
      dateField: this._descriptor.dateField,
      esql: this._descriptor.esql,
      geoField: this._descriptor.geoField,
      narrowByMapBounds: this._descriptor.narrowByMapBounds,
      narrowByGlobalTime: this._descriptor.narrowByGlobalTime,
    };
  }

  getIndexPatternId() {
    if (this._dataViewId) return this._dataViewId;

    // Can not use getESQLAdHocDataview to create adhocDataViewId because it's async
    // getESQLAdHocDataview is async because `crypto.subtle.digest` is async
    // getESQLAdHocDataview falls back to `@kbn/crypto-browser` when `crypto` is not available
    // we will just always use the fallback implemenation.
    const indexPattern = getIndexPatternFromESQLQuery(this._descriptor.esql);
    this._dataViewId = new Sha256().update(`esql-${indexPattern}`).digest('hex');
    return this._dataViewId;
  }

  getIndexPattern() {
    return getESQLAdHocDataview({
      dataViewsService: getIndexPatternService(),
      query: this._descriptor.esql,
      http: getHttp(),
    });
  }

  getGeoFieldName() {
    return this._descriptor.geoField;
  }

  getESQL() {
    return this._descriptor.esql;
  }

  getProjectRouting() {
    return getProjectRoutingFromEsqlQuery(this.getESQL());
  }

  private _getDataViewFields = async () => {
    return getFields(await this.getIndexPattern());
  };
}
