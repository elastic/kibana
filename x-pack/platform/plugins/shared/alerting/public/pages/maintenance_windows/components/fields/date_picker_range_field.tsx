/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import moment, { Moment } from 'moment';
import { EuiDatePicker, EuiDatePickerRange, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import {
  useFormData,
  useFormContext,
  FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../../translations';
import { getSelectedForDatePicker as getSelected } from '../../helpers/get_selected_for_date_picker';

interface DatePickerRangeFieldProps {
  fields: { startDate: FieldHook<string, string>; endDate: FieldHook<string, string> };
  timezone?: string[];
  showTimeSelect?: boolean;
  'data-test-subj'?: string;
}

export const DatePickerRangeField: React.FC<DatePickerRangeFieldProps> = React.memo(
  ({ fields, timezone, showTimeSelect = true, ...rest }) => {
    const [today] = useState<Moment>(moment());

    const { setFieldValue } = useFormContext();
    const [form] = useFormData({ watch: [fields.startDate.path, fields.endDate.path] });

    const { selected: startDate, utcOffset: startOffset } = getSelected(
      form,
      fields.startDate.path,
      timezone
    );
    const { selected: endDate, utcOffset: endOffset } = getSelected(
      form,
      fields.endDate.path,
      timezone
    );

    const onStartDateChange = useCallback(
      (currentDate: Moment | null) => {
        if (currentDate && currentDate.isAfter(endDate)) {
          // if the current start date is ahead of the end date
          // set the end date to the current start date + 30 min
          const updatedEndDate = moment(currentDate).add(30, 'minutes');
          setFieldValue(fields.endDate.path, updatedEndDate);
        }
        // convert the moment date back into a string if it's not null
        setFieldValue(fields.startDate.path, currentDate ? currentDate.toISOString() : currentDate);
      },
      [setFieldValue, endDate, fields.endDate.path, fields.startDate.path]
    );

    const onEndDateChange = useCallback(
      (currentDate: Moment | null) => {
        // convert the moment date back into a string if it's not null
        setFieldValue(fields.endDate.path, currentDate ? currentDate.toISOString() : currentDate);
      },
      [setFieldValue, fields.endDate.path]
    );
    const isInvalid = startDate.isAfter(endDate);

    return (
      <>
        <EuiFormRow label={fields.startDate.label} {...rest} fullWidth>
          <EuiDatePickerRange
            isInvalid={isInvalid}
            startDateControl={
              <EuiDatePicker
                selected={startDate}
                onChange={(date) => date && onStartDateChange(date)}
                startDate={startDate}
                endDate={endDate}
                aria-label="Start date"
                showTimeSelect={showTimeSelect}
                minDate={today}
                utcOffset={startOffset}
              />
            }
            endDateControl={
              <EuiDatePicker
                selected={endDate}
                onChange={(date) => date && onEndDateChange(date)}
                startDate={startDate}
                endDate={endDate}
                aria-label="End date"
                showTimeSelect={showTimeSelect}
                minDate={today}
                utcOffset={endOffset}
              />
            }
            fullWidth
          />
        </EuiFormRow>
        {isInvalid ? (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="danger">
              {i18n.CREATE_FORM_SCHEDULE_INVALID}
            </EuiText>
          </>
        ) : null}
      </>
    );
  }
);
DatePickerRangeField.displayName = 'DatePickerRangeField';
