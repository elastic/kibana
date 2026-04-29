/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import moment, { type Moment } from 'moment';
import { EuiDatePicker, EuiDatePickerRange, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../contexts/kibana';

interface CustomUrlTimeRangePickerProps {
  onCustomTimeRangeChange: (customTimeRange?: { start: Moment; end: Moment }) => void;
  customTimeRange?: { start: Moment; end: Moment };
  disabled: boolean;
}

/*
 * React component for the form for adding a custom time range.
 */
export const CustomTimeRangePicker: FC<CustomUrlTimeRangePickerProps> = ({
  onCustomTimeRangeChange,
  customTimeRange,
  disabled,
}) => {
  const [showCustomTimeRangeSelector, setShowCustomTimeRangeSelector] = useState<boolean>(false);
  const {
    services: {
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();

  // If the custom time range is not set, default to the timefilter settings
  const currentTimeRange = useMemo(
    () =>
      customTimeRange ?? {
        start: moment(timefilter.getAbsoluteTime().from),
        end: moment(timefilter.getAbsoluteTime().to),
      },
    [customTimeRange, timefilter]
  );

  const onCustomTimeRangeSwitchChange = (checked: boolean) => {
    if (checked === false) {
      // Clear the custom time range so it isn't persisted
      onCustomTimeRangeChange(undefined);
    } else {
      onCustomTimeRangeChange(currentTimeRange);
    }
    setShowCustomTimeRangeSelector(checked);
  };

  const handleStartChange = (date: moment.Moment) => {
    onCustomTimeRangeChange({ ...currentTimeRange, start: date });
  };
  const handleEndChange = (date: moment.Moment) => {
    onCustomTimeRangeChange({ ...currentTimeRange, end: date });
  };

  const { start, end } = currentTimeRange;

  return (
    <>
      <EuiSwitch
        disabled={disabled}
        label={i18n.translate('xpack.ml.customUrlsEditor.addCustomTimeRangeSwitchLabel', {
          defaultMessage: 'Add custom time range',
        })}
        checked={showCustomTimeRangeSelector}
        onChange={(e) => onCustomTimeRangeSwitchChange(e.target.checked)}
      />
      {showCustomTimeRangeSelector ? (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.customTimeRangeLabel"
                defaultMessage="Custom time range"
              />
            }
          >
            <EuiDatePickerRange
              data-test-subj={`mlCustomUrlsDateRange`}
              isInvalid={start > end}
              startDateControl={
                <EuiDatePicker
                  selected={start}
                  onChange={handleStartChange}
                  startDate={start}
                  endDate={end}
                  aria-label={i18n.translate('xpack.ml.customUrlsEditor.customTimeRangeStartDate', {
                    defaultMessage: 'Start date',
                  })}
                  showTimeSelect
                />
              }
              endDateControl={
                <EuiDatePicker
                  selected={end}
                  onChange={handleEndChange}
                  startDate={start}
                  endDate={end}
                  aria-label={i18n.translate('xpack.ml.customUrlsEditor.customTimeRangeEndDate', {
                    defaultMessage: 'End date',
                  })}
                  showTimeSelect
                />
              }
            />
          </EuiFormRow>
        </>
      ) : null}
    </>
  );
};
