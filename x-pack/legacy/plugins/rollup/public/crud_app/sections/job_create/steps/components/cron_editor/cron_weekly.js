/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

export const CronWeekly = ({
  minute,
  minuteOptions,
  hour,
  hourOptions,
  day,
  dayOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.rollupJobs.cronEditor.cronWeekly.fieldDateLabel"
          defaultMessage="Day"
        />
      )}
      fullWidth
      data-test-subj="rollupCronFrequencyConfiguration"
    >
      <EuiSelect
        options={dayOptions}
        value={day}
        onChange={e => onChange({ day: e.target.value })}
        fullWidth
        prepend={(
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.rollupJobs.cronEditor.cronWeekly.textOnLabel"
                defaultMessage="On"
              />
            </strong>
          </EuiText>
        )}
        data-test-subj="rollupJobCreateFrequencyWeeklyDaySelect"
      />
    </EuiFormRow>

    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.rollupJobs.cronEditor.cronWeekly.fieldTimeLabel"
          defaultMessage="Time"
        />
      )}
      fullWidth
      data-test-subj="rollupCronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            onChange={e => onChange({ hour: e.target.value })}
            fullWidth
            prepend={(
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.rollupJobs.cronEditor.cronWeekly.fieldHour.textAtLabel"
                    defaultMessage="At"
                  />
                </strong>
              </EuiText>
            )}
            data-test-subj="rollupJobCreateFrequencyWeeklyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            onChange={e => onChange({ minute: e.target.value })}
            fullWidth
            prepend={(
              <EuiText size="xs">
                <strong>
                  :
                </strong>
              </EuiText>
            )}
            data-test-subj="rollupJobCreateFrequencyWeeklyMinuteSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  </Fragment>
);

CronWeekly.propTypes = {
  minute: PropTypes.string.isRequired,
  minuteOptions: PropTypes.array.isRequired,
  hour: PropTypes.string.isRequired,
  hourOptions: PropTypes.array.isRequired,
  day: PropTypes.string.isRequired,
  dayOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
