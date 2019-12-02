/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScaleType } from '@elastic/charts';
import { MatrixOverTimeHistogramData, MatrixOverOrdinalHistogramData } from '../../graphql/types';
import { AuthMatrixDataFields } from '../page/hosts/authentications_over_time/utils';
import { UpdateDateRange } from '../charts/common';

export type MatrixHistogramDataTypes = MatrixOverTimeHistogramData | MatrixOverOrdinalHistogramData;
export type MatrixHistogramMappingTypes = AuthMatrixDataFields;
export interface MatrixHistogramBasicProps<T> {
  data: T[];
  endDate: number;
  id: string;
  loading: boolean;
  mapping?: MatrixHistogramMappingTypes;
  startDate: number;
  totalCount: number;
  updateDateRange: UpdateDateRange;
}

export interface MatrixHistogramProps<T> extends MatrixHistogramBasicProps<T> {
  dataKey?: string;
  scaleType?: ScaleType;
  subtitle?: string;
  title?: string;
  yTickFormatter?: (value: number) => string;
  showLegend?: boolean;
}
