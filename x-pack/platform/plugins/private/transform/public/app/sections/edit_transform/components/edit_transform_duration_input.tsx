/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useRef, useState } from 'react';

import { css } from '@emotion/react';
import { EuiFieldNumber, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useEditTransformFlyoutActions } from '../state_management/edit_transform_flyout_state';
import type { FormFields } from '../state_management/form_field';
import { useFormField } from '../state_management/selectors/form_field';
import { capitalizeFirstLetter } from '../utils/capitalize_first_letter';

export type DurationUnit = 'nanos' | 'micros' | 'ms' | 's' | 'm' | 'h' | 'd';

const durationUnitLabels: Record<DurationUnit, string> = {
  nanos: i18n.translate('xpack.transform.transformList.durationUnit.nanoseconds', {
    defaultMessage: 'nanoseconds',
  }),
  micros: i18n.translate('xpack.transform.transformList.durationUnit.microseconds', {
    defaultMessage: 'microseconds',
  }),
  ms: i18n.translate('xpack.transform.transformList.durationUnit.milliseconds', {
    defaultMessage: 'milliseconds',
  }),
  s: i18n.translate('xpack.transform.transformList.durationUnit.seconds', {
    defaultMessage: 'seconds',
  }),
  m: i18n.translate('xpack.transform.transformList.durationUnit.minutes', {
    defaultMessage: 'minutes',
  }),
  h: i18n.translate('xpack.transform.transformList.durationUnit.hours', {
    defaultMessage: 'hours',
  }),
  d: i18n.translate('xpack.transform.transformList.durationUnit.days', {
    defaultMessage: 'days',
  }),
};

const durationPattern = /^(\d+)(nanos|micros|ms|s|m|h|d)$/;
const invalidNumberKeys = ['-', '+', '.', 'e', 'E'];
const durationUnitSelectStyles = css`
  background: transparent;
  box-shadow: none;
`;

interface EditTransformDurationInputProps {
  defaultUnit: DurationUnit;
  field: Extract<FormFields, 'frequency' | 'retentionPolicyMaxAge'>;
  helpText?: string;
  label: string;
  showErrors?: boolean;
  units: readonly DurationUnit[];
}

export const EditTransformDurationInput: FC<EditTransformDurationInputProps> = ({
  defaultUnit,
  field,
  helpText,
  label,
  showErrors = true,
  units,
}) => {
  const { errorMessages, value } = useFormField(field);
  const { setFormField } = useEditTransformFlyoutActions();
  const durationMatch = durationPattern.exec(value);
  const durationValue = durationMatch?.[1] ?? '';
  const parsedUnit = durationMatch?.[2] as DurationUnit | undefined;
  const [pickedUnit, setPickedUnit] = useState<DurationUnit>();
  const previousParsedUnit = useRef(parsedUnit);
  if (parsedUnit !== undefined) {
    previousParsedUnit.current = parsedUnit;
  }
  const unit = parsedUnit ?? pickedUnit ?? previousParsedUnit.current ?? defaultUnit;
  const displayedErrors = showErrors ? errorMessages : [];
  const upperCaseField = capitalizeFirstLetter(field);
  const unitOptions = useMemo(
    () =>
      units.map((durationUnit) => ({
        value: durationUnit,
        text: durationUnitLabels[durationUnit],
      })),
    [units]
  );

  const setDurationValue = (nextValue: string) => {
    setFormField({
      field,
      value: nextValue === '' ? '' : `${nextValue}${unit}`,
    });
  };

  const setDurationUnit = (nextUnit: DurationUnit) => {
    setPickedUnit(nextUnit);
    if (durationValue !== '') {
      setFormField({ field, value: `${durationValue}${nextUnit}` });
    }
  };

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={displayedErrors.length > 0}
      error={displayedErrors}
      fullWidth
      display="rowCompressed"
    >
      <EuiFieldNumber
        append={
          <EuiSelect
            aria-label={i18n.translate(
              'xpack.transform.transformList.editFlyoutDurationUnitAriaLabel',
              {
                defaultMessage: '{label} unit',
                values: { label },
              }
            )}
            compressed
            css={durationUnitSelectStyles}
            data-test-subj={`transformEditFlyout${upperCaseField}UnitSelect`}
            options={unitOptions}
            value={unit}
            onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
          />
        }
        aria-label={i18n.translate(
          'xpack.transform.transformList.editFlyoutDurationValueAriaLabel',
          {
            defaultMessage: '{label} value',
            values: { label },
          }
        )}
        compressed
        data-test-subj={`transformEditFlyout${upperCaseField}Input`}
        fullWidth
        isInvalid={displayedErrors.length > 0}
        min={1}
        step={1}
        value={durationValue}
        onChange={(event) => setDurationValue(event.target.value)}
        onKeyDown={(event) => {
          if (invalidNumberKeys.includes(event.key)) {
            event.preventDefault();
          }
        }}
      />
    </EuiFormRow>
  );
};
