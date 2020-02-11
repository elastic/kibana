/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Position } from '@elastic/charts';
import React from 'react';
import { compose } from 'redux';

import { connect } from 'react-redux';
import { State, inputsSelectors, hostsModel, networkModel } from '../../store';
import { QueryTemplateProps } from '../query_template';

import { Maybe } from '../../graphql/types';
import { MatrixHistogram } from '../../components/matrix_histogram';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
  GetTitle,
  GetSubTitle,
} from '../../components/matrix_histogram/types';
import { UpdateDateRange } from '../../components/charts/common';
import { SetQuery } from '../../pages/hosts/navigation/types';

export interface OwnProps extends QueryTemplateProps {
  chartHeight?: number;
  dataKey: string | string[];
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  headerChildren?: React.ReactNode;
  hideHistogramIfEmpty?: boolean;
  isAlertsHistogram?: boolean;
  isAnomaliesHistogram?: boolean;
  isAuthenticationsHistogram?: boolean;
  id: string;
  isDnsHistogram?: boolean;
  isEventsHistogram?: boolean;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  panelHeight?: number;
  query: Maybe<string>;
  setQuery: SetQuery;
  showLegend?: boolean;
  sourceId: string;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string | GetTitle;
  type: hostsModel.HostsType | networkModel.NetworkType;
  updateDateRange: UpdateDateRange;
}

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const MatrixHistogramContainer = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps)
)(MatrixHistogram);
