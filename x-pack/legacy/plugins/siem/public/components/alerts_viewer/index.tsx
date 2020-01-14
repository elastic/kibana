/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { noop } from 'lodash/fp';
import React, { useEffect, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { AlertsComponentsQueryProps } from './types';
import { AlertsTable } from './alerts_table';
import * as i18n from './translations';
import { MatrixHistogramOption } from '../matrix_histogram/types';
import { MatrixHistogramContainer } from '../../containers/matrix_histogram';
import { MatrixHistogramGqlQuery } from '../../containers/matrix_histogram/index.gql_query';
const ID = 'alertsOverTimeQuery';
const alertsStackByOptions: MatrixHistogramOption[] = [
  {
    text: i18n.ALERTS_STACK_BY_MODULE,
    value: 'event.module',
  },
];
const dataKey = 'AlertsHistogram';

export const AlertsView = ({
  deleteQuery,
  endDate,
  filterQuery,
  pageFilters,
  setQuery,
  skip,
  startDate,
  type,
  updateDateRange = noop,
}: AlertsComponentsQueryProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, []);

  const getSubtitle = useCallback(
    (totalCount: number) => `${i18n.SHOWING}: ${totalCount} ${i18n.UNIT(totalCount)}`,
    []
  );

  return (
    <>
      <MatrixHistogramContainer
        dataKey={dataKey}
        deleteQuery={deleteQuery}
        defaultStackByOption={alertsStackByOptions[0]}
        endDate={endDate}
        errorMessage={i18n.ERROR_FETCHING_ALERTS_DATA}
        filterQuery={filterQuery}
        id={ID}
        isAlertsHistogram={true}
        query={MatrixHistogramGqlQuery}
        setQuery={setQuery}
        skip={skip}
        sourceId="default"
        stackByOptions={alertsStackByOptions}
        startDate={startDate}
        subtitle={getSubtitle}
        title={i18n.ALERTS_DOCUMENT_TYPE}
        type={type}
        updateDateRange={updateDateRange}
      />
      <EuiSpacer size="l" />
      <AlertsTable endDate={endDate} startDate={startDate} pageFilters={pageFilters} />
    </>
  );
};
AlertsView.displayName = 'AlertsView';
