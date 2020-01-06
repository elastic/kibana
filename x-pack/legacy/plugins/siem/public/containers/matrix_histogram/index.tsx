/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { compose } from 'redux';

import { connect } from 'react-redux';
import { inputsModel, State, inputsSelectors, hostsModel, networkModel } from '../../store';
import { QueryTemplateProps } from '../query_template';
import { withKibana } from '../../lib/kibana';

import { MatrixOverTimeHistogramData, Maybe } from '../../graphql/types';
import { MatrixHistogram } from '../../components/matrix_histogram';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
} from '../../components/matrix_histogram/types';
import { UpdateDateRange } from '../../components/charts/common';

export interface EventsArgs {
  endDate: number;
  eventsOverTime: MatrixOverTimeHistogramData[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  totalCount: number;
}

export interface OwnProps extends QueryTemplateProps {
  dataKey: string | string[];
  defaultStackByOption: MatrixHistogramOption;
  hideHistogramIfEmpty?: boolean;
  id: string;
  mapping?: MatrixHistogramMappingTypes;
  query: Maybe<string>;
  sourceId: string;
  stackByOptions: MatrixHistogramOption[];
  type: hostsModel.HostsType | networkModel.NetworkType;
  title: string;
  updateDateRange: UpdateDateRange;
}

export interface EventsOverTimeComponentReduxProps {
  isInspected: boolean;
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
  connect(makeMapStateToProps),
  withKibana
)(MatrixHistogram);
