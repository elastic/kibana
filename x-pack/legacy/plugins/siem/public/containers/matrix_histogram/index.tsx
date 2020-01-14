/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  GetSubTitle,
} from '../../components/matrix_histogram/types';
import { UpdateDateRange } from '../../components/charts/common';
import { SetQuery } from '../../pages/hosts/navigation/types';

export interface OwnProps extends QueryTemplateProps {
  isAlertsHistogram?: boolean;
  isAnomaliesHistogram?: boolean;
  isAuthenticationsHistogram?: boolean;
  dataKey: string | string[];
  defaultStackByOption: MatrixHistogramOption;
  deleteQuery?: ({ id }: { id: string }) => void;
  isEventsType?: boolean;
  errorMessage: string;
  hideHistogramIfEmpty?: boolean;
  id: string;
  mapping?: MatrixHistogramMappingTypes;
  query: Maybe<string>;
  setQuery: SetQuery;
  sourceId: string;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string;
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
