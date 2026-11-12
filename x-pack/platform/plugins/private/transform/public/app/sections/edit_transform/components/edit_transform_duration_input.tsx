/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useEffect, useMemo, useState } from 'react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useEditTransformFlyoutActions } from '../state_management/edit_transform_flyout_state';
import type { FormFields } from '../state_management/form_field';
import { useFormField } from '../state_management/selectors/form_field';
import { capitalizeFirstLetter } from '../utils/capitalize_first_letter';

export type DurationUnit = 'nanos' | 'micros' | 'ms' | 's' | 'm' | 'h' | 'd';

const durationUnitLabels: Record<DurationUnit, string> = {
  nanos: i18n.translate('xpack.transform.transformList.durationUnit.nanoseconds', {
    defaultMessage: 'Nanoseconds',
  }),
  micros: i18n.translate('xpack.transform.transformList.durationUnit.microseconds', {
    defaultMessage: 'Microseconds',
  }),
  ms: i18n.translate('xpack.transform.transformList.durationUnit.milliseconds', {
    defaultMessage: 'Milliseconds',
  }),
  s: i18n.translate('xpack.transform.transformList.durationUnit.seconds', {
    defaultMessage: 'Seconds',
  }),
  m: i18n.translate('xpack.transform.transformList.durationUnit.minutes', {
    defaultMessage: 'Minutes',
  }),
  h: i18n.translate('xpack.transform.transformList.durationUnit.hours', {
    defaultMessage: 'Hours',
  }),
  d: i18n.translate('xpack.transform.transformList.durationUnit.days', {
    defaultMessage: 'Days',
  }),
};

const durationPattern = /^(\d+)(nanos|micros|ms|s|m|h|d)$/;
const invalidNumberKeys = ['-', '+', '.', 'e', 'E'];

interface EditTransformDurationInputProps {
  defaultUnit: DurationUnit;
  field: Extract<FormFields, 'frequency' | 'retentionPolicyMaxAge'>;
  helpText?: string;
  label: string;
  units: readonly DurationUnit[];
}

export const EditTransformDurationInput: FC<EditTransformDurationInputProps> = ({
  defaultUnit,
  field,
  helpText,
  label,
  units,
}) => {
  const { errorMessages, value } = useFormField(field);
  const { setFormField } = useEditTransformFlyoutActions();
  const durationMatch = durationPattern.exec(value);
  const durationValue = durationMatch?.[1] ?? '';
  const parsedUnit = durationMatch?.[2] as DurationUnit | undefined;
  const [unit, setUnit] = useState<DurationUnit>(parsedUnit ?? defaultUnit);
  const upperCaseField = capitalizeFirstLetter(field);
  const unitOptions = useMemo(
    () =>
      units.map((durationUnit) => ({
        value: durationUnit,
        text: durationUnitLabels[durationUnit],
      })),
    [units]
  );

  useEffect(() => {
    if (parsedUnit !== undefined) {
      setUnit(parsedUnit);
    }
  }, [parsedUnit]);

  const setDurationValue = (nextValue: string) => {
    setFormField({
      field,
      value: nextValue === '' ? '' : `${nextValue}${unit}`,
    });
  };

  const setDurationUnit = (nextUnit: DurationUnit) => {
    setUnit(nextUnit);
    if (durationValue !== '') {
      setFormField({ field, value: `${durationValue}${nextUnit}` });
    }
  };

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={errorMessages.length > 0}
      error={errorMessages}
      fullWidth
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={2}>
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.transform.transformList.editFlyoutDurationValueAriaLabel',
              {
                defaultMessage: '{label} value',
                values: { label },
              }
            )}
            data-test-subj={`transformEditFlyout${upperCaseField}Input`}
            fullWidth
            isInvalid={errorMessages.length > 0}
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
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiSelect
            aria-label={i18n.translate(
              'xpack.transform.transformList.editFlyoutDurationUnitAriaLabel',
              {
                defaultMessage: '{label} unit',
                values: { label },
              }
            )}
            data-test-subj={`transformEditFlyout${upperCaseField}UnitSelect`}
            fullWidth
            options={unitOptions}
            value={unit}
            onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
