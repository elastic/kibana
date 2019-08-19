/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import moment, { Moment } from 'moment';

import { i18n } from '@kbn/i18n';
import {
  EuiForm,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFormControlLayout,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CreateMLJobsButton } from './create_ml_jobs_button';

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
  isSettingUp: boolean;
  setupMlModule: (startTime: number | undefined, endTime: number | undefined) => Promise<any>;
}> = ({ isSettingUp, setupMlModule }) => {
  const [startTime, setStartTime] = useState<Moment | null>(null);
  const [endTime, setEndTime] = useState<Moment | null>(null);

  const now = useMemo(() => moment(), []);
  const selectedEndTimeIsToday = !endTime || endTime.isSame(now, 'day');

  const onClickCreateJob = () =>
    setupMlModule(selectedDateToParam(startTime), selectedDateToParam(endTime));

  return (
    <EuiForm>
      <EuiDescribedFormGroup
        idAria="timeRange"
        title={
          <FormattedMessage
            id="xpack.infra.analysisSetup.timeRangeTitle"
            defaultMessage="Choose a time range"
          />
        }
        description={
          <FormattedMessage
            id="xpack.infra.analysisSetup.timeRangeDescription"
            defaultMessage="By default, Machine Learning analyzes log messages from the start of your log indices and continues indefinitely. You can specify a different date to begin, to end, or both."
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
              clear={startTime ? { onClick: () => setStartTime(null) } : undefined}
            >
              <EuiDatePicker
                showTimeSelect
                selected={startTime}
                onChange={setStartTime}
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
            <EuiFormControlLayout clear={endTime ? { onClick: () => setEndTime(null) } : undefined}>
              <EuiDatePicker
                showTimeSelect
                selected={endTime}
                onChange={setEndTime}
                placeholder={endTimeDefaultDescription}
                openToDate={now}
                minDate={now}
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
        <CreateMLJobsButton isLoading={isSettingUp} onClick={onClickCreateJob} />
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
