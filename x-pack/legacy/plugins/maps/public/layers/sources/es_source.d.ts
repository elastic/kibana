/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import { IVectorSource } from './vector_source';
import { IndexPattern, SearchSource } from '../../../../../../../src/plugins/data/public';
import { VectorSourceRequestMeta } from '../../../common/data_request_descriptor_types';

export interface IESSource extends IVectorSource {
  getId(): string;
  getIndexPattern(): Promise<IndexPattern>;
  getIndexPatternId(): string;
  getGeoFieldName(): string;
  getMaxResultWindow(): Promise<number>;
  makeSearchSource(
    searchFilters: VectorSourceRequestMeta,
    limit: number,
    initialSearchContext?: object
  ): Promise<SearchSource>;
}

export class AbstractESSource extends AbstractVectorSource implements IESSource {
  getId(): string;
  getIndexPattern(): Promise<IndexPattern>;
  getIndexPatternId(): string;
  getGeoFieldName(): string;
  getMaxResultWindow(): Promise<number>;
  makeSearchSource(
    searchFilters: VectorSourceRequestMeta,
    limit: number,
    initialSearchContext?: object
  ): Promise<SearchSource>;
}
