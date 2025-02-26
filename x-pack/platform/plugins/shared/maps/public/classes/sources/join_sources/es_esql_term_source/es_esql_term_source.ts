/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/es-query';
import { Adapters } from '@kbn/inspector-plugin/common';
import { SearchResponseWarning } from '@kbn/search-response-warnings';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { PropertiesMap } from '../../../../../common/elasticsearch_util';
import { ITooltipProperty } from '../../../..';
import { IField } from '../../../fields/field';
import { IJoinSource } from '../types';
import {
  DataFilters,
  ESESQLTermSourceDescriptor,
  VectorSourceRequestMeta,
} from '../../../../../common/descriptor_types';
import { FIELD_ORIGIN, SOURCE_TYPES } from '../../../../../common/constants';
import { ESQLSource } from '../../esql_source';

export class ESESQLTermSource extends ESQLSource implements IJoinSource {
  static type = SOURCE_TYPES.ES_ESQL_TERM_SOURCE;

  static createDescriptor(
    descriptor: Partial<ESESQLTermSourceDescriptor>
  ): ESESQLTermSourceDescriptor {
    const normalizedDescriptor = ESQLSource.createDescriptor(descriptor);

    return {
      term: '',
      ...normalizedDescriptor,
      type: SOURCE_TYPES.ES_ESQL_TERM_SOURCE,
    };
  }

  readonly _descriptor: ESESQLTermSourceDescriptor;

  constructor(descriptor: Partial<ESESQLTermSourceDescriptor>) {
    console.log('CONSRUCTOR - CREATE ESQL TERM SOURCE', descriptor);
    const sourceDescriptor = ESESQLTermSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  hasCompleteConfig(): boolean {
    return !!this._descriptor.term;
  }

  getOriginForField(): FIELD_ORIGIN {
    return FIELD_ORIGIN.JOIN;
  }

  getRightFields(): IField[] {
    console.log('GET THE RIGHt FIELDS', this);
    return [];
  }

  getWhereQuery(): {
    return;
  };
  getJoinMetrics(
    requestMeta: VectorSourceRequestMeta,
    layerName: string,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters,
    featureCollection?: FeatureCollection
  ): Promise<{
    joinMetrics: PropertiesMap;
    warnings: SearchResponseWarning[];
  }> {
    console.log('get join metrics');
    return new Promise(() => {
      return { joinMetrics: {}, warnings: [] };
    });
  }

  /*
   * Use getSyncMeta to expose join configurations that require join data re-fetch when changed.
   */
  getSyncMeta(dataFilters: DataFilters): object | null;

  getId() {
    return this._descriptor.id;
  }

  getTooltipProperties(properties: GeoJsonProperties, executionContext: KibanaExecutionContext) {
    console.log('get tooltip properties');
    return [];
  }

  // getFieldByName(fieldName: string):  IField | null  {
  //   console.log('get field by name');
  //   return null
  // };
}
