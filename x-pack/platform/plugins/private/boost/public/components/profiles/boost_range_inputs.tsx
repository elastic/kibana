/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_BOOST, MIN_BOOST } from '../../../common/constants';
import type { BoostRangeError, MaxAgeError, MaxAgeUnit } from '../../../common/validation';
import type { BoostRangeDraft } from './profile_draft';
import { BOOST_RANGE_ERROR_MESSAGES, MAX_AGE_ERROR_MESSAGES } from './profile_messages';

interface MaxAgeInput {
  value: string;
  unit: MaxAgeUnit;
  onChange: (value: string) => void;
  onUnitChange: (unit: MaxAgeUnit) => void;
  error?: MaxAgeError;
}

interface BoostRangeInputsProps {
  range: BoostRangeDraft;
  onChange: (range: BoostRangeDraft) => void;
  /** Validation error to display; omitted until the user first tries to save. */
  error?: BoostRangeError;
  /** Adds a max age input after the boost inputs, for data stream periods. */
  maxAge?: MaxAgeInput;
  /** Leaves an empty max age column, so the inputs line up with periods that have one. */
  reserveMaxAgeColumn?: boolean;
  disabled: boolean;
  testSubjPrefix: string;
}

// Ascending by length.
const MAX_AGE_UNITS: readonly MaxAgeUnit[] = ['h', 'd'];

const UNIT_LABELS: Readonly<Record<MaxAgeUnit, string>> = {
  d: i18n.translate('xpack.boost.profileForm.daysUnit', { defaultMessage: 'days' }),
  h: i18n.translate('xpack.boost.profileForm.hoursUnit', { defaultMessage: 'hours' }),
};

interface MaxAgeUnitButtonProps {
  unit: MaxAgeUnit;
  onChange: (unit: MaxAgeUnit) => void;
  disabled: boolean;
  testSubjPrefix: string;
}

/** Shows the max age unit and opens a menu to switch between days and hours. */
const MaxAgeUnitButton = ({ unit, onChange, disabled, testSubjPrefix }: MaxAgeUnitButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useGeneratedHtmlId({ prefix: 'maxAgeUnitMenu' });
  const label = i18n.translate('xpack.boost.profileForm.ageUnitLabel', {
    defaultMessage: 'Age unit',
  });

  return (
    <EuiPopover
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          isDisabled={disabled}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={i18n.translate('xpack.boost.profileForm.ageUnitButtonLabel', {
            defaultMessage: 'Age unit: {unit}',
            values: { unit: UNIT_LABELS[unit] },
          })}
          data-test-subj={`${testSubjPrefix}MaxAgeUnit`}
        >
          {UNIT_LABELS[unit]}
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel
        id={menuId}
        items={MAX_AGE_UNITS.map((option) => (
          <EuiContextMenuItem
            key={option}
            icon={option === unit ? 'check' : 'empty'}
            onClick={() => {
              onChange(option);
              setIsOpen(false);
            }}
            data-test-subj={`${testSubjPrefix}MaxAgeUnit-${option}`}
          >
            {UNIT_LABELS[option]}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};

/** Side-by-side minimum and maximum boost inputs, with an optional max age input. */
export const BoostRangeInputs = ({
  range,
  onChange,
  error,
  maxAge,
  reserveMaxAgeColumn = false,
  disabled,
  testSubjPrefix,
}: BoostRangeInputsProps) => {
  const errorMessage = error && BOOST_RANGE_ERROR_MESSAGES[error];
  const minError = errorMessage?.field === 'min' ? errorMessage.message : undefined;
  const maxError = errorMessage?.field === 'max' ? errorMessage.message : undefined;
  const maxAgeError = maxAge?.error && MAX_AGE_ERROR_MESSAGES[maxAge.error];

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiFormRow
          display="rowCompressed"
          label={i18n.translate('xpack.boost.profileForm.minBoostInputLabel', {
            defaultMessage: 'Min boost',
          })}
          isInvalid={Boolean(minError)}
          error={minError}
          fullWidth
        >
          <EuiFieldNumber
            compressed
            fullWidth
            value={range.minBoost}
            onChange={({ target: { value } }) => onChange({ ...range, minBoost: value })}
            min={MIN_BOOST}
            max={MAX_BOOST}
            step="any"
            isInvalid={Boolean(minError)}
            disabled={disabled}
            data-test-subj={`${testSubjPrefix}MinBoost`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          display="rowCompressed"
          label={i18n.translate('xpack.boost.profileForm.maxBoostInputLabel', {
            defaultMessage: 'Max boost',
          })}
          isInvalid={Boolean(maxError)}
          error={maxError}
          fullWidth
        >
          <EuiFieldNumber
            compressed
            fullWidth
            value={range.maxBoost}
            onChange={({ target: { value } }) => onChange({ ...range, maxBoost: value })}
            min={MIN_BOOST}
            max={MAX_BOOST}
            step="any"
            isInvalid={Boolean(maxError)}
            disabled={disabled}
            data-test-subj={`${testSubjPrefix}MaxBoost`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      {maxAge ? (
        <EuiFlexItem>
          <EuiFormRow
            display="rowCompressed"
            label={i18n.translate('xpack.boost.profileForm.untilAgeLabel', {
              defaultMessage: 'Until data age',
            })}
            isInvalid={Boolean(maxAgeError)}
            error={maxAgeError}
            fullWidth
          >
            <EuiFieldNumber
              compressed
              fullWidth
              value={maxAge.value}
              onChange={({ target: { value } }) => maxAge.onChange(value)}
              // 0 skips the phase.
              min={0}
              step={1}
              append={
                <MaxAgeUnitButton
                  unit={maxAge.unit}
                  onChange={maxAge.onUnitChange}
                  disabled={disabled}
                  testSubjPrefix={testSubjPrefix}
                />
              }
              isInvalid={Boolean(maxAgeError)}
              disabled={disabled}
              data-test-subj={`${testSubjPrefix}MaxAge`}
            />
          </EuiFormRow>
        </EuiFlexItem>
      ) : (
        reserveMaxAgeColumn && <EuiFlexItem aria-hidden={true} />
      )}
    </EuiFlexGroup>
  );
};
