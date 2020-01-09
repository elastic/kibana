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
  TimerangeInput,
  Maybe,
  Source,
} from '../../graphql/types';
import { ESQuery } from '../../../common/typed_json';
import { SetQuery } from '../../pages/hosts/navigation/types';
import { UpdateDateRange } from '../../components/charts/common';
import { networkModel, hostsModel } from '../../store';

export type MatrixHistogramDataTypes = MatrixOverTimeHistogramData | MatrixOverOrdinalHistogramData;
export type MatrixHistogramMappingTypes = Record<
  string,
  { key: string; value: null; color?: string | undefined }
>;
export interface MatrixHistogramOption {
  text: string;
  value: string;
}
export interface MatrixHistogramBasicProps {
  dataKey: string;
  deleteQuery?: ({ id }: { id: string }) => void;
  defaultStackByOption: MatrixHistogramOption;
  endDate: number;
  filterQuery?: ESQuery | string | undefined;
  hideHistogramIfEmpty?: boolean;
  id: string;
  mapping?: MatrixHistogramMappingTypes;
  query: DocumentNode;
  setQuery: SetQuery;
  skip: boolean;
  sourceId: string;
  startDate: number;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string;
  title?: string;
  type?: networkModel.NetworkType | hostsModel.HostsType;
  updateDateRange: UpdateDateRange;
}

export interface MatrixHistogramQueryProps {
  activePage?: number;
  dataKey: string;
  endDate: number;
  filterQuery?: ESQuery | string | undefined;
  limit?: number;
  sort?: NetworkDnsSortField;
  stackByField: string;
  skip: boolean;
  startDate: number;
  title: string;
  isInspected: boolean;
  isPtrIncluded: boolean;
  isHistogram?: boolean;
  pagination?: PaginationInputPaginated;
  query: DocumentNode;
}

export interface MatrixHistogramProps extends MatrixHistogramBasicProps {
  scaleType?: ScaleType;
  yTickFormatter?: (value: number) => string;
  showLegend?: boolean;
  legendPosition?: Position;
}

export interface MatrixHistogramQueryVariables<SortField = NetworkDnsSortField> {
  sourceId: string;
  timerange: TimerangeInput;
  filterQuery?: Maybe<string>;
  defaultIndex: string[];
  inspect: boolean;
  isHistogram?: boolean;
  sort?: SortField;
  stackByField: string;
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
