/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScaleType, Position } from '@elastic/charts';
import { SetStateAction } from 'react';
import { DocumentNode } from 'graphql';
import {
  MatrixOverTimeHistogramData,
  MatrixOverOrdinalHistogramData,
  NetworkDnsSortField,
  PaginationInputPaginated,
} from '../../graphql/types';
import { UpdateDateRange } from '../charts/common';
import { ESQuery } from '../../../common/typed_json';
import { SetQuery } from '../../pages/hosts/navigation/types';

export type MatrixHistogramDataTypes = MatrixOverTimeHistogramData | MatrixOverOrdinalHistogramData;
export type MatrixHistogramMappingTypes = Record<
  string,
  { key: string; value: null; color?: string | undefined }
>;
export interface MatrixHistogramOption {
  text: string;
  value: string;
}

export type GetSubTitle = (count: number) => string;
export type GetTitle = (matrixHistogramOption: MatrixHistogramOption) => string;

export interface MatrixHistogramBasicProps {
  chartHeight?: number;
  defaultIndex: string[];
  defaultStackByOption: MatrixHistogramOption;
  endDate: number;
  headerChildren?: React.ReactNode;
  hideHistogramIfEmpty?: boolean;
  id: string;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  panelHeight?: number;
  setQuery: SetQuery;
  sourceId: string;
  startDate: number;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title?: string;
  updateDateRange: UpdateDateRange;
}

export interface MatrixHistogramQueryProps {
  activePage?: number;
  dataKey: string;
  endDate: number;
  errorMessage: string;
  filterQuery?: ESQuery | string | undefined;
  limit?: number;
  query: DocumentNode;
  sort?: NetworkDnsSortField;
  stackByField: string;
  skip: boolean;
  startDate: number;
  title: string | GetTitle;
  isAlertsHistogram?: boolean;
  isAnomaliesHistogram?: boolean;
  isAuthenticationsHistogram?: boolean;
  isDnsHistogram?: boolean;
  isEventsHistogram?: boolean;
  isInspected: boolean;
  isPtrIncluded?: boolean;
  pagination?: PaginationInputPaginated;
}

export interface MatrixHistogramProps extends MatrixHistogramBasicProps {
  scaleType?: ScaleType;
  yTickFormatter?: (value: number) => string;
  showLegend?: boolean;
  legendPosition?: Position;
}

export interface HistogramBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
}
export interface GroupBucket {
  key: string;
  signals: {
    buckets: HistogramBucket[];
  };
}

export interface HistogramAggregation {
  histogramAgg: {
    buckets: GroupBucket[];
  };
}

export interface SignalsResponse {
  took: number;
  timeout: boolean;
}

export interface SignalSearchResponse<Hit = {}, Aggregations = {} | undefined>
  extends SignalsResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export type Return<Hit, Aggs> = [
  boolean,
  SignalSearchResponse<Hit, Aggs> | null,
  React.Dispatch<SetStateAction<string>>
];
