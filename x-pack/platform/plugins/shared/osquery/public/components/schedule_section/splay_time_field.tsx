/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController, useWatch } from 'react-hook-form';

import { isSplayWithinMax, type SplayUnit } from '../../../common/utils/splay_utils';
import { DEFAULT_SPLAY_VALUE } from './types';

const SPLAY_UNIT_OPTIONS: Array<{ value: SplayUnit; text: string }> = [
  {
    value: 'seconds',
    text: i18n.translate('xpack.osquery.scheduleSection.splay.unit.seconds', {
      defaultMessage: 'Second(s)',
    }),
  },
  {
    value: 'minutes',
    text: i18n.translate('xpack.osquery.scheduleSection.splay.unit.minutes', {
      defaultMessage: 'Minute(s)',
    }),
  },
  {
    value: 'hours',
    text: i18n.translate('xpack.osquery.scheduleSection.splay.unit.hours', {
      defaultMessage: 'Hour(s)',
    }),
  },
];

interface SplayTimeFieldProps {
  isDisabled?: boolean;
}

const SplayTimeFieldComponent: React.FC<SplayTimeFieldProps> = ({ isDisabled = false }) => {
  const splayUnit = useWatch<{ splay_unit: SplayUnit }, 'splay_unit'>({ name: 'splay_unit' });
  const splayValue = useWatch<{ splay_value: number }, 'splay_value'>({ name: 'splay_value' });

  const {
    field: { value: enabled, onChange: onEnabledChange },
  } = useController<{ splay_enabled: boolean }, 'splay_enabled'>({
    name: 'splay_enabled',
    defaultValue: false,
  });

  const {
    field: { value, onChange: onValueChange },
    fieldState: { error: valueError },
  } = useController<{ splay_value: number }, 'splay_value'>({
    name: 'splay_value',
    defaultValue: DEFAULT_SPLAY_VALUE,
    rules: {
      validate: (next) => {
        if (!enabled) {
          return true;
        }

        if (!Number.isInteger(next) || next <= 0) {
          return i18n.translate('xpack.osquery.scheduleSection.splay.positiveErrorMessage', {
            defaultMessage: 'Splay must be a positive integer',
          });
        }

        if (!isSplayWithinMax({ value: next, unit: splayUnit })) {
          return i18n.translate('xpack.osquery.scheduleSection.splay.maxErrorMessage', {
            defaultMessage: 'Splay duration must not exceed 1 hour',
          });
        }

        return true;
      },
    },
  });

  const {
    field: { value: unit, onChange: onUnitChange },
  } = useController<{ splay_unit: SplayUnit }, 'splay_unit'>({
    name: 'splay_unit',
    defaultValue: 'minutes',
    rules: {
      validate: () => {
        if (!enabled) {
          return true;
        }

        if (!isSplayWithinMax({ value: splayValue, unit: splayUnit })) {
          return i18n.translate('xpack.osquery.scheduleSection.splay.maxErrorMessage', {
            defaultMessage: 'Splay duration must not exceed 1 hour',
          });
        }

        return true;
      },
    },
  });

  const handleToggle = useCallback(
    (event: EuiSwitchEvent) => {
      onEnabledChange(event.target.checked);
    },
    [onEnabledChange]
  );

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(event.target.valueAsNumber || 0);
    },
    [onValueChange]
  );

  const handleUnitChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onUnitChange(event.target.value as SplayUnit);
    },
    [onUnitChange]
  );

  const unitSelectOptions = useMemo(
    () => SPLAY_UNIT_OPTIONS.map(({ value: optValue, text }) => ({ value: optValue, text })),
    []
  );

  const hasError = enabled && !!valueError?.message;

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.osquery.scheduleSection.splay.label', {
                  defaultMessage: 'Splay time',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.osquery.scheduleSection.splay.toggleLabel', {
                defaultMessage: 'Splay time',
              })}
              showLabel={false}
              checked={enabled}
              onChange={handleToggle}
              disabled={isDisabled}
              compressed
              data-test-subj="osquery-schedule-splay-toggle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.osquery.scheduleSection.splay.description', {
            defaultMessage:
              "Randomly delay execution within the query's interval (1 second – 1 hour).",
          })}
        </EuiText>
      }
      error={hasError ? valueError?.message : undefined}
      isInvalid={hasError}
      fullWidth
    >
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFieldNumber
              min={1}
              value={value}
              onChange={handleValueChange}
              isInvalid={hasError}
              disabled={isDisabled || !enabled}
              data-test-subj="osquery-schedule-splay-value"
              fullWidth
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              options={unitSelectOptions}
              value={unit}
              onChange={handleUnitChange}
              disabled={isDisabled || !enabled}
              data-test-subj="osquery-schedule-splay-unit"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </EuiFormRow>
  );
};

export const SplayTimeField = React.memo(SplayTimeFieldComponent);
