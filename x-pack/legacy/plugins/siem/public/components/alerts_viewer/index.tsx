/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import gql from 'graphql-tag';
import { AlertsComponentsQueryProps } from './types';
import { hostsModel } from '../../store/model';
import { AlertsTable } from './alerts_table';
import * as i18n from './translations';
import { SignalsHistogramOption } from '../matrix_histogram/types';
import { getMatrixHistogramQuery } from '../../containers/helpers';
import { MatrixHistogramContainer } from '../../containers/matrix_histogram';

const ID = 'alertsOverTimeQuery';
const alertsStackByOptions: SignalsHistogramOption[] = [
  {
    text: i18n.ALERTS_STACK_BY_ACTIONS,
    value: 'event.actions',
  },
];
const dataKey = 'Alerts';
const AlertsOverTimeGqlQuery = gql`
  ${getMatrixHistogramQuery('Alerts')}
`;
export const AlertsView = ({
  defaultFilters,
  deleteQuery,
  endDate,
  filterQuery,
  pageFilters,
  skip,
  setQuery,
  startDate,
  type,
  updateDateRange = noop,
}: AlertsComponentsQueryProps) => (
  <>
    <MatrixHistogramContainer
      dataKey={dataKey}
      defaultStackByOption={alertsStackByOptions[0]}
      endDate={endDate}
      id={ID}
      query={AlertsOverTimeGqlQuery}
      setQuery={setQuery}
      stackByOptions={alertsStackByOptions}
      startDate={startDate}
      subtitle={`${i18n.SHOWING}: {{totalCount}} ${i18n.UNIT(-1)}`}
      title={`${i18n.ALERTS_DOCUMENT_TYPE} ${i18n.ALERTS_BY}`}
      updateDateRange={updateDateRange}
      filterQuery={filterQuery}
      sourceId="default"
      type={hostsModel.HostsType.page}
    />
    <EuiSpacer size="l" />
    <AlertsTable endDate={endDate} startDate={startDate} pageFilters={pageFilters} />
  </>
);

AlertsView.displayName = 'AlertsView';
