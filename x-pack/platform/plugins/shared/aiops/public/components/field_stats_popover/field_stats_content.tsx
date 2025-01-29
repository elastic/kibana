/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState, useCallback } from 'react';
import type {
  FieldStatsProps,
  FieldStatsServices,
  FieldStatsState,
  FieldTopValuesBucketParams,
} from '@kbn/unified-field-list/src/components/field_stats';
import {
  FieldStats,
  FieldTopValuesBucket,
} from '@kbn/unified-field-list/src/components/field_stats';
import { isDefined } from '@kbn/ml-is-defined';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, euiPaletteColorBlind, EuiSpacer, EuiText } from '@elastic/eui';

const DEFAULT_COLOR = euiPaletteColorBlind()[0];
const HIGHLIGHTED_FIELD_PROPS = {
  color: 'accent',
  textProps: {
    color: 'accent',
  },
};

function getPercentValue(
  currentValue: number,
  totalCount: number,
  digitsRequired: boolean
): number {
  const percentageString =
    totalCount > 0
      ? `${(Math.round((currentValue / totalCount) * 1000) / 10).toFixed(digitsRequired ? 1 : 0)}`
      : '';
  return Number(percentageString);
}

interface FieldStatsContentProps {
  dataView: DataView;
  field: DataViewField;
  fieldName: string;
  fieldValue: string | number;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
  dslQuery?: FieldStatsProps['dslQuery'];
}

export const FieldStatsContent: FC<FieldStatsContentProps> = ({
  dataView: currentDataView,
  field,
  fieldName,
  fieldValue,
  fieldStatsServices,
  timeRangeMs,
  dslQuery,
}) => {
  const [fieldStatsState, setFieldStatsState] = useState<FieldStatsState | undefined>();

  // Format timestamp to ISO formatted date strings
  const timeRange = useMemo(() => {
    // Use the provided timeRange if available
    if (timeRangeMs) {
      return {
        from: moment(timeRangeMs.from).toISOString(),
        to: moment(timeRangeMs.to).toISOString(),
      };
    }

    const now = moment();
    return { from: now.toISOString(), to: now.toISOString() };
  }, [timeRangeMs]);

  const onStateChange = useCallback((nextState: FieldStatsState) => {
    setFieldStatsState(nextState);
  }, []);

  const individualStatForDisplay = useMemo((): {
    needToDisplayIndividualStat: boolean;
    percentage: string;
  } => {
    const defaultIndividualStatForDisplay = {
      needToDisplayIndividualStat: false,
      percentage: '< 1%',
    };
    if (fieldStatsState === undefined) return defaultIndividualStatForDisplay;

    const { topValues: currentTopValues, sampledValues } = fieldStatsState;

    const idxToHighlight =
      currentTopValues?.buckets && Array.isArray(currentTopValues.buckets)
        ? currentTopValues.buckets.findIndex((value) => value.key === fieldValue)
        : null;

    const needToDisplayIndividualStat =
      idxToHighlight === -1 && fieldName !== undefined && fieldValue !== undefined;

    if (needToDisplayIndividualStat) {
      defaultIndividualStatForDisplay.needToDisplayIndividualStat = true;

      const buckets =
        currentTopValues?.buckets && Array.isArray(currentTopValues.buckets)
          ? currentTopValues.buckets
          : [];
      let lowestPercentage: number | undefined;

      // Taken from the unifiedFieldList plugin
      const digitsRequired = buckets.some(
        (bucket) => !Number.isInteger(bucket.count / (sampledValues ?? 5000))
      );

      buckets.forEach((bucket) => {
        const currentPercentage = getPercentValue(
          bucket.count,
          sampledValues ?? 5000,
          digitsRequired
        );

        if (lowestPercentage === undefined || currentPercentage < lowestPercentage) {
          lowestPercentage = currentPercentage;
        }
      });

      defaultIndividualStatForDisplay.percentage = `< ${lowestPercentage ?? 1}%`;
    }

    return defaultIndividualStatForDisplay;
  }, [fieldStatsState, fieldName, fieldValue]);

  const overrideFieldTopValueBar = useCallback(
    (fieldTopValuesBucketParams: FieldTopValuesBucketParams) => {
      if (fieldTopValuesBucketParams.type === 'other') {
        return { color: 'primary' };
      }
      return fieldValue === fieldTopValuesBucketParams.fieldValue ? HIGHLIGHTED_FIELD_PROPS : {};
    },
    [fieldValue]
  );

  const showFieldStats = timeRange && isDefined(currentDataView) && field;

  if (!showFieldStats) return null;
  const formatter = currentDataView.getFormatterForField(field);

  return (
    <>
      <FieldStats
        key={field.name}
        services={fieldStatsServices}
        dslQuery={dslQuery ?? { match_all: {} }}
        fromDate={timeRange.from}
        toDate={timeRange.to}
        dataViewOrDataViewId={currentDataView}
        field={field}
        data-test-subj={`mlAiOpsFieldStatsPopoverContent ${field.name}`}
        color={DEFAULT_COLOR}
        onStateChange={onStateChange}
        overrideFieldTopValueBar={overrideFieldTopValueBar}
      />
      {individualStatForDisplay.needToDisplayIndividualStat ? (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.aiops.fieldContextPopover.notTopTenValueMessage"
              defaultMessage="Selected term is not in the top 10"
            />
          </EuiText>
          <EuiSpacer size="s" />
          <FieldTopValuesBucket
            field={field}
            fieldValue={fieldValue}
            formattedPercentage={individualStatForDisplay.percentage}
            formattedFieldValue={formatter.convert(fieldValue)}
            // Always set as completed since calc is done once we're here
            progressValue={100}
            count={0}
            overrideFieldTopValueBar={overrideFieldTopValueBar}
            {...{ 'data-test-subj': 'aiopsNotInTopTenFieldTopValueBucket' }}
            {...HIGHLIGHTED_FIELD_PROPS}
          />
        </>
      ) : null}
    </>
  );
};
