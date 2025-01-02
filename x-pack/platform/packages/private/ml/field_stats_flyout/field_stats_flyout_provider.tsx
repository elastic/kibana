/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren, FC } from 'react';
import React, { useCallback, useState } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type { FieldStatsProps } from '@kbn/unified-field-list/src/components/field_stats';
import { useEffect } from 'react';
import { stringHash } from '@kbn/ml-string-hash';
import { useRef } from 'react';
import { getRangeFilter } from './populated_fields/get_range_filter';
import { FieldStatsFlyout } from './field_stats_flyout';
import { MLFieldStatsFlyoutContext } from './use_field_stats_flyout_context';
import { PopulatedFieldsCacheManager } from './populated_fields/populated_fields_cache_manager';

/**
 * Props for the FieldStatsFlyoutProvider component.
 *
 * @typedef {Object} FieldStatsFlyoutProviderProps
 * @property dataView - The data view object.
 * @property fieldStatsServices - Services required for field statistics.
 * @property theme - The EUI theme service.
 * @property [timeRangeMs] - Optional time range in milliseconds.
 * @property [dslQuery] - Optional DSL query for filtering field statistics.
 * @property [disablePopulatedFields] - Optional flag to disable populated fields.
 */
export type FieldStatsFlyoutProviderProps = PropsWithChildren<{
  dataView: DataView;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
  dslQuery?: FieldStatsProps['dslQuery'];
  disablePopulatedFields?: boolean;
}>;

/**
 * Provides field statistics in a flyout component.
 *
 * @component
 * @example
 * ```tsx
 * <FieldStatsFlyoutProvider
 *   dataView={dataView}
 *   fieldStatsServices={fieldStatsServices}
 *   timeRangeMs={timeRangeMs}
 *   dslQuery={dslQuery}
 *   disablePopulatedFields={disablePopulatedFields}
 * >
 *   {children}
 * </FieldStatsFlyoutProvider>
 * ```
 *
 * @param {FieldStatsFlyoutProviderProps} props - The component props.
 */
export const FieldStatsFlyoutProvider: FC<FieldStatsFlyoutProviderProps> = (props) => {
  const {
    dataView,
    fieldStatsServices,
    timeRangeMs,
    dslQuery,
    disablePopulatedFields = false,
    children,
  } = props;
  const [isFieldStatsFlyoutVisible, setFieldStatsIsFlyoutVisible] = useState(false);
  const [fieldName, setFieldName] = useState<string | undefined>();
  const [fieldValue, setFieldValue] = useState<string | number | undefined>();

  const toggleFieldStatsFlyoutVisible = useCallback(
    () => setFieldStatsIsFlyoutVisible(!isFieldStatsFlyoutVisible),
    [isFieldStatsFlyoutVisible]
  );
  const [manager] = useState(new PopulatedFieldsCacheManager());
  const [populatedFields, setPopulatedFields] = useState<Set<string> | undefined>();
  const abortController = useRef(new AbortController());

  useEffect(
    function fetchSampleDocsEffect() {
      if (disablePopulatedFields) return;

      let unmounted = false;

      if (abortController.current) {
        abortController.current.abort();
        abortController.current = new AbortController();
      }

      const indexPattern = dataView.getIndexPattern();
      const indexFilter = getRangeFilter(dataView.getTimeField()?.name, timeRangeMs);
      const cacheKey = stringHash(JSON.stringify(indexFilter)).toString();

      const fetchPopulatedFields = async function () {
        try {
          const nonEmptyFields = await fieldStatsServices.dataViews.getFieldsForWildcard({
            pattern: indexPattern,
            includeEmptyFields: false,
            indexFilter: getRangeFilter(dataView.getTimeField()?.name, timeRangeMs),
          });

          const fieldsWithData = new Set([...nonEmptyFields.map((field) => field.name)]);

          manager.set(cacheKey, fieldsWithData);
          if (!unmounted) {
            setPopulatedFields(fieldsWithData);
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            // eslint-disable-next-line no-console
            console.error(
              `An error occurred fetching field caps documents to determine populated field stats.
          \nError:${e}`
            );
          }
        }
      };

      const cachedResult = manager.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      } else {
        fetchPopulatedFields();
      }

      return () => {
        unmounted = true;
        abortController.current.abort();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify({ dslQuery, dataViewId: dataView.id, timeRangeMs })]
  );

  return (
    <MLFieldStatsFlyoutContext.Provider
      value={{
        isFlyoutVisible: isFieldStatsFlyoutVisible,
        setIsFlyoutVisible: setFieldStatsIsFlyoutVisible,
        toggleFlyoutVisible: toggleFieldStatsFlyoutVisible,
        setFieldName,
        fieldName,
        setFieldValue,
        fieldValue,
        timeRangeMs,
        populatedFields,
      }}
    >
      <FieldStatsFlyout
        dataView={dataView}
        fieldStatsServices={fieldStatsServices}
        timeRangeMs={timeRangeMs}
        dslQuery={dslQuery}
      />
      {children}
    </MLFieldStatsFlyoutContext.Provider>
  );
};
