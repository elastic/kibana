/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type {
  FieldStatsProps,
  FieldStatsServices,
} from '@kbn/unified-field-list/src/components/field_stats';
import { FieldStats } from '@kbn/unified-field-list/src/components/field_stats';
import { isDefined } from '@kbn/ml-is-defined';
import type { DataView } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { getDefaultDSLQuery } from '@kbn/ml-query-utils';
import moment from 'moment';
import { euiPaletteColorBlind } from '@elastic/eui';
import { useFieldStatsFlyoutContext } from './use_field_stats_flyout_context';

const DEFAULT_COLOR = euiPaletteColorBlind()[0];

/**
 * Represents the props for the FieldStatsFlyout component.
 */
export interface FieldStatsFlyoutProps {
  /**
   * The data view object.
   */
  dataView: DataView;
  /**
   * Services required for field statistics.
   */
  fieldStatsServices: FieldStatsServices;
  /**
   * Optional time range in milliseconds.
   */
  timeRangeMs?: TimeRangeMs;
  /**
   * Optional DSL query for filtering field statistics.
   */
  dslQuery?: FieldStatsProps['dslQuery'];
}

/**
 * Renders the content for the field statistics flyout.
 * @param props - The props for the FieldStatsContent component.
 * @returns The rendered FieldStatsContent component.
 */
export const FieldStatsContent: FC<FieldStatsFlyoutProps> = (props) => {
  const { dataView: selectedDataView, fieldStatsServices, timeRangeMs, dslQuery } = props;
  const { fieldName } = useFieldStatsFlyoutContext();

  // Format timestamp to ISO formatted date strings
  const timeRange = useMemo(() => {
    // Use the provided timeRange if available
    if (timeRangeMs) {
      return {
        from: moment(timeRangeMs.from).toISOString(),
        to: moment(timeRangeMs.to).toISOString(),
      };
    }

    // If time range is available via jobCreator, use that
    // else mimic Discover and set timeRange to be now for data view without time field
    const now = moment();
    return { from: now.toISOString(), to: now.toISOString() };
  }, [timeRangeMs]);

  const fieldForStats = useMemo(
    () => (isDefined(fieldName) ? selectedDataView.getFieldByName(fieldName) : undefined),
    [fieldName, selectedDataView]
  );

  const showFieldStats = timeRange && isDefined(selectedDataView) && fieldForStats;

  return showFieldStats ? (
    <FieldStats
      key={fieldForStats.name}
      services={fieldStatsServices}
      dslQuery={dslQuery ?? getDefaultDSLQuery()}
      fromDate={timeRange.from}
      toDate={timeRange.to}
      dataViewOrDataViewId={selectedDataView}
      field={fieldForStats}
      data-test-subj={`mlFieldStatsFlyoutContent ${fieldForStats.name}`}
      color={DEFAULT_COLOR}
    />
  ) : null;
};
