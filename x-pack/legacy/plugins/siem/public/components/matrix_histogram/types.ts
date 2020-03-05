/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScaleType, Position, TickFormatter } from '@elastic/charts';
import { ActionCreator } from 'redux';
import { ESQuery } from '../../../common/typed_json';
import { SetQuery } from '../../pages/hosts/navigation/types';
import { InputsModelId } from '../../store/inputs/constants';
import { HistogramType } from '../../graphql/types';
import { UpdateDateRange } from '../charts/common';

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

export interface MatrixHisrogramConfigs {
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  hideHistogramIfEmpty?: boolean;
  histogramType: HistogramType;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string | GetTitle;
}

interface MatrixHistogramBasicProps {
  chartHeight?: number;
  defaultIndex: string[];
  defaultStackByOption: MatrixHistogramOption;
  dispatchSetAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
  endDate: number;
  headerChildren?: React.ReactNode;
  hideHistogramIfEmpty?: boolean;
  id: string;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  panelHeight?: number;
  setQuery: SetQuery;
  startDate: number;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title?: string | GetTitle;
}

export interface MatrixHistogramQueryProps {
  endDate: number;
  errorMessage: string;
  filterQuery?: ESQuery | string | undefined;
  stackByField: string;
  startDate: number;
  isInspected: boolean;
  histogramType: HistogramType;
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

export interface BarchartConfigs {
  series: {
    xScaleType: ScaleType;
    yScaleType: ScaleType;
    stackAccessors: string[];
  };
  axis: {
    xTickFormatter: TickFormatter;
    yTickFormatter: TickFormatter;
    tickSize: number;
  };
  settings: {
    legendPosition: Position;
    onBrushEnd: UpdateDateRange;
    showLegend: boolean;
    theme: {
      scales: {
        barsPadding: number;
      };
      chartMargins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
      chartPaddings: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
    };
  };
  customHeight: number;
}
