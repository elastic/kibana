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

import { MatrixHistogram } from '../../components/matrix_histogram';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
  GetTitle,
  GetSubTitle,
  HistogramType,
} from '../../components/matrix_histogram/types';
import { UpdateDateRange } from '../../components/charts/common';
import { SetQuery } from '../../pages/hosts/navigation/types';

export interface OwnProps extends QueryTemplateProps {
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  headerChildren?: React.ReactNode;
  hideHistogramIfEmpty?: boolean;
  histogramType: HistogramType;
  id: string;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  setQuery: SetQuery;
  showLegend?: boolean;
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
