/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScaleType } from '@elastic/charts';
import { SetStateAction } from 'react';
import { Dispatch } from 'src/plugins/kibana_utils/public';
import { DocumentNode } from 'graphql';
import {
  MatrixOverTimeHistogramData,
  MatrixOverOrdinalHistogramData,
  NetworkDnsSortField,
  PaginationInputPaginated,
  TimerangeInput,
  Maybe,
  Source,
} from '../../graphql/types';
import { UpdateDateRange } from '../charts/common';
import { ESQuery } from '../../../common/typed_json';

export type MatrixHistogramDataTypes = MatrixOverTimeHistogramData | MatrixOverOrdinalHistogramData;
export type MatrixHistogramMappingTypes = Record<
  string,
  { key: string; value: null; color: string }
>;
export interface MatrixHistogramOption {
  text: string;
  value: string;
}
export interface MatrixHistogramBasicProps {
  defaultIndex: string[];
  defaultStackByOption: MatrixHistogramOption;
  endDate: number;
  hideHistogramIfEmpty?: boolean;
  id: string;
  mapping?: MatrixHistogramMappingTypes;
  sourceId: string;
  startDate: number;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string;
  title?: string;
  updateDateRange: UpdateDateRange;
}

export interface MatrixHistogramQueryProps {
  activePage?: number;
  dataKey: string;
  endDate: number;
  filterQuery?: ESQuery | string | undefined;
  limit?: number;
  query: DocumentNode;
  sort?: NetworkDnsSortField;
  startDate: number;
  isInspected: boolean;
  isPtrIncluded: boolean;
  isHistogram?: boolean;
  pagination?: PaginationInputPaginated;
}

export interface MatrixHistogramQueryActionProps {
  setLoading: Dispatch<SetStateAction<boolean>>;
  setData: Dispatch<SetStateAction<MatrixHistogramDataTypes[] | null>>;
  setTotalCount: Dispatch<SetStateAction<number>>;
}

export interface MatrixHistogramProps extends MatrixHistogramBasicProps {
  scaleType?: ScaleType;
  yTickFormatter?: (value: number) => string;
  showLegend?: boolean;
}

export interface MatrixHistogramQueryVariables<SortField> {
  sourceId: string;
  timerange: TimerangeInput;
  filterQuery?: Maybe<string>;
  defaultIndex: string[];
  inspect: boolean;
  isHistogram?: boolean;
  sort?: SortField;
  isPtrIncluded: boolean;
  pagination?: PaginationInputPaginated;
}

export interface MatrixHistogramQuery {
  source: Source;
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
