/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDatePicker,
  EuiDatePickerProps,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFormControlLayout,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React, { useMemo } from 'react';

import { euiStyled } from '../../../../../../../../common/eui_styled_components';

const startTimeLabel = i18n.translate('xpack.infra.analysisSetup.startTimeLabel', {
  defaultMessage: 'Start time',
});
const endTimeLabel = i18n.translate('xpack.infra.analysisSetup.endTimeLabel', {
  defaultMessage: 'End time',
});
const startTimeDefaultDescription = i18n.translate(
  'xpack.infra.analysisSetup.startTimeDefaultDescription',
  {
    defaultMessage: 'Start of log indices',
  }
);
const endTimeDefaultDescription = i18n.translate(
  'xpack.infra.analysisSetup.endTimeDefaultDescription',
  {
    defaultMessage: 'Indefinitely',
  }
);

function selectedDateToParam(selectedDate: Moment | null) {
  if (selectedDate) {
    return selectedDate.valueOf(); // To ms unix timestamp
  }
  return undefined;
}

export const AnalysisSetupTimerangeForm: React.FunctionComponent<{
  setStartTime: (startTime: number | undefined) => void;
  setEndTime: (endTime: number | undefined) => void;
  startTime: number | undefined;
  endTime: number | undefined;
}> = ({ setStartTime, setEndTime, startTime, endTime }) => {
  const now = useMemo(() => moment(), []);
  const selectedEndTimeIsToday = !endTime || moment(endTime).isSame(now, 'day');
  const startTimeValue = useMemo(() => {
    return startTime ? moment(startTime) : undefined;
  }, [startTime]);
  const endTimeValue = useMemo(() => {
    return endTime ? moment(endTime) : undefined;
  }, [endTime]);
  return (
    <EuiDescribedFormGroup
      idAria="timeRange"
      title={
        <h3>
          <FormattedMessage
            id="xpack.infra.analysisSetup.timeRangeTitle"
            defaultMessage="Choose a time range"
          />
        </h3>
      }
      description={
        <FormattedMessage
          id="xpack.infra.analysisSetup.timeRangeDescription"
          defaultMessage="By default, Machine Learning analyzes log messages in your log indices no older than four weeks, and continues indefinitely. You can specify a different date to begin, to end, or both."
        />
      }
    >
      <EuiFormRow
        describedByIds={['timeRange']}
        error={false}
        fullWidth
        isInvalid={false}
        label={startTimeLabel}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFormControlLayout
            clear={startTime ? { onClick: () => setStartTime(undefined) } : undefined}
          >
            <FixedDatePicker
              showTimeSelect
              selected={startTimeValue}
              onChange={date => setStartTime(selectedDateToParam(date))}
              placeholder={startTimeDefaultDescription}
              maxDate={now}
            />
          </EuiFormControlLayout>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow
        describedByIds={['timeRange']}
        error={false}
        fullWidth
        isInvalid={false}
        label={endTimeLabel}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFormControlLayout
            clear={endTime ? { onClick: () => setEndTime(undefined) } : undefined}
          >
            <FixedDatePicker
              showTimeSelect
              selected={endTimeValue}
              onChange={date => setEndTime(selectedDateToParam(date))}
              placeholder={endTimeDefaultDescription}
              openToDate={now}
              minDate={startTimeValue}
              minTime={
                selectedEndTimeIsToday
                  ? now
                  : moment()
                      .hour(0)
                      .minutes(0)
              }
              maxTime={moment()
                .hour(23)
                .minutes(59)}
            />
          </EuiFormControlLayout>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

const FixedDatePicker = euiStyled(
  ({
    className,
    inputClassName,
    ...datePickerProps
  }: {
    className?: string;
    inputClassName?: string;
  } & EuiDatePickerProps) => (
    <EuiDatePicker {...datePickerProps} className={inputClassName} popperClassName={className} />
  )
)`
  z-index: 3 !important;
`;
