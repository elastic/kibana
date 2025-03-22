/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Adapters } from '@kbn/inspector-plugin/common';
import { SearchResponseWarning } from '@kbn/search-response-warnings';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { ESQLColumn } from '@kbn/es-types';
import { lastValueFrom, tap } from 'rxjs';
import { getData } from '../../../../kibana_services';
import { copyPersistentState } from '../../../../reducers/copy_persistent_state';
import { AbstractSource } from '../../source';
import { isValidStringConfig } from '../../../util/valid_string_config';
import { BucketProperties, PropertiesMap } from '../../../../../common/elasticsearch_util';
import { IField } from '../../../fields/field';
import { IJoinSource } from '../types';
import {
  DataFilters,
  ESQLTermSourceDescriptor,
  ESTermSourceDescriptor,
  VectorSourceRequestMeta,
} from '../../../../../common/descriptor_types';
import { FIELD_ORIGIN, SOURCE_TYPES } from '../../../../../common/constants';
import { getFieldType } from '../../../../components/esql_utils';
import { InlineField } from '../../../fields/inline_field';

export class ESQLTermSource extends AbstractSource implements IJoinSource {
  // export class ESESQLTermSource extends ESQLSource implements IJoinSource {
  static type = SOURCE_TYPES.ES_ESQL_TERM_SOURCE;

  static createDescriptor(descriptor: Partial<ESQLTermSourceDescriptor>): ESQLTermSourceDescriptor {
    return {
      term: descriptor.term || '',
      type: SOURCE_TYPES.ES_ESQL_TERM_SOURCE,
      id: isValidStringConfig(descriptor.id) ? descriptor.id! : uuidv4(),
      esql: descriptor.esql || '',
      narrowByGlobalSearch: descriptor.narrowByGlobalSearch || false,
      narrowByGlobalTime: descriptor.narrowByGlobalTime || true,
      applyForceRefresh: descriptor.applyForceRefresh || false,
      columns: descriptor.columns || [],
      dataViewId: descriptor.dataViewId || '',
    };
  }

  readonly _descriptor: ESQLTermSourceDescriptor;

  constructor(descriptor: Partial<ESQLTermSourceDescriptor>) {
    const sourceDescriptor = ESQLTermSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  hasCompleteConfig(): boolean {
    return !!this._descriptor.term;
  }

  // getOriginForField(): FIELD_ORIGIN {
  //   return FIELD_ORIGIN.JOIN;
  // }

  getRightFields(): IField[] {
    const fields: IField[] = [];
    this._descriptor.columns.forEach((column) => {
      const fieldType = getFieldType(column);
      if (fieldType) {
        fields.push(
          new InlineField({
            fieldName: column.name,
            source: this,
            origin: FIELD_ORIGIN.JOIN,
            dataType: fieldType,
          })
        );
      }
    });
    return fields;
  }

  getWhereQuery(): Query | undefined {
    console.log('GET WHERE QUERY');
    return;
  }

  isMvt() {
    // this is CRUMMY - should never be required.
    return false;
  }

  async getJoinMetrics(
    requestMeta: VectorSourceRequestMeta,
    layerName: string,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters,
    featureCollection?: FeatureCollection
  ): Promise<{
    joinMetrics: PropertiesMap;
    warnings: SearchResponseWarning[];
  }> {
    console.log('GET JOIN METRICS join metrics');

    if (!this.hasCompleteConfig()) {
      return {
        joinMetrics: new Map<string, BucketProperties>(),
        warnings: [],
      };
    }

    const params = {
      query: this._descriptor.esql,
      dropNullColumns: true,
    };

    console.log('p', params);
    const { rawResponse, requestParams } = await lastValueFrom(
      getData()
        .search.search(
          { params },
          {
            strategy: 'esql',
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

    console.log('rawResponse', rawResponse);

    const joinMetrics = new Map<string, BucketProperties>();

    const colIndex = rawResponse.columns.findIndex((col) => col.name === this._descriptor.term);
    console.log('co', colIndex);

    rawResponse.values.forEach((values) => {
      const obj = {};
      for (let i = 0; i < rawResponse.columns.length; i++) {
        obj[rawResponse.columns[i].name] = values[i];
      }

      joinMetrics.set(values[colIndex], obj);
    });

    console.log('joinMetrics', joinMetrics);

    return { joinMetrics, warnings: [] };
  }

  /*
   * Use getSyncMeta to expose join configurations that require join data re-fetch when changed.
   */
  getSyncMeta(dataFilters: DataFilters): object | null {
    return null;
  }

  getId() {
    return this._descriptor.id;
  }

  getTooltipProperties(properties: GeoJsonProperties, executionContext: KibanaExecutionContext) {
    console.log('get tooltip properties');
    return [];
  }

  getFieldByName(fieldName: string): IField | null {
    // todo: dupe imlpe
    const column = this._descriptor.columns.find(({ name }) => {
      return name === fieldName;
    });
    const fieldType = column ? getFieldType(column) : undefined;
    return column && fieldType
      ? new InlineField({
          fieldName: column.name,
          source: this,
          origin: FIELD_ORIGIN.JOIN,
          dataType: fieldType,
        })
      : null;
  }

  getApplyForceRefresh(): boolean {
    return this._descriptor.applyForceRefresh;
  }

  getApplyGlobalQuery(): boolean {
    return this._descriptor.applyForceRefresh;
  }

  getApplyGlobalTime(): boolean {
    return this._descriptor.narrowByGlobalTime;
  }

  async getImmutableProperties(dataFilters: DataFilters): Promise<ImmutableSourceProperty[]> {
    return [];
  }

  isQueryAware(): boolean {
    return true; // ?
  }

  async isTimeAware(): Promise<boolean> {
    return true; // ?
  }

  async supportsFitToBounds(): Promise<boolean> {
    return false;
  }
}
