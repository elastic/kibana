/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { noop } from 'lodash/fp';
import React, { useEffect, useCallback, useMemo } from 'react';
import numeral from '@elastic/numeral';

import { AlertsComponentsQueryProps } from './types';
import { AlertsTable } from './alerts_table';
import * as i18n from './translations';
import { useUiSetting$ } from '../../lib/kibana';
import { DEFAULT_NUMBER_FORMAT } from '../../../common/constants';
import { MatrixHistogramContainer } from '../matrix_histogram';
import { histogramConfigs } from './histogram_configs';
const ID = 'alertsOverTimeQuery';

export const AlertsView = ({
  deleteQuery,
  endDate,
  filterQuery,
  pageFilters,
  setQuery,
  startDate,
  type,
  updateDateRange = noop,
}: AlertsComponentsQueryProps) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const getSubtitle = useCallback(
    (totalCount: number) =>
      `${i18n.SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${i18n.UNIT(
        totalCount
      )}`,
    []
  );
  const alertsHistogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      subtitle: getSubtitle,
      updateDateRange,
    }),
    [getSubtitle, updateDateRange]
  );
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, []);

  return (
    <>
      <MatrixHistogramContainer
        endDate={endDate}
        filterQuery={filterQuery}
        id={ID}
        setQuery={setQuery}
        sourceId="default"
        startDate={startDate}
        type={type}
        {...alertsHistogramConfigs}
      />
      <AlertsTable endDate={endDate} startDate={startDate} pageFilters={pageFilters} />
    </>
  );
};
AlertsView.displayName = 'AlertsView';
