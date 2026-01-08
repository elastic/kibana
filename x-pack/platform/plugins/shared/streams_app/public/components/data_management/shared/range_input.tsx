/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiCheckbox, EuiToolTip } from '@elastic/eui';
import type { EuiComboBoxProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RangeCondition } from '@kbn/streamlang';
import type { Suggestion } from './autocomplete_selector';
import { AutocompleteSelector } from './autocomplete_selector';

export interface RangeInputProps {
  value: RangeCondition;
  onChange: (value: RangeCondition) => void;
  valueSuggestions?: Suggestion[];
  disabled?: boolean;
  compressed?: boolean;
  dataTestSubj?: string;
}

/**
 * Range input component that allows users to specify a range with "from" and "to" values
 * selected from actual field values in the data.
 * Uses checkboxes to control whether boundaries are inclusive (gte/lte) or exclusive (gt/lt).
 */
export const RangeInput: React.FC<RangeInputProps> = ({
  value,
  onChange,
  valueSuggestions = [],
  disabled = false,
  compressed = false,
  dataTestSubj = 'streamsAppRangeInput',
}) => {
  // Determine current operator types and values
  const fromOperator = useMemo(() => {
    if (value.gte !== undefined) return 'gte';
    if (value.gt !== undefined) return 'gt';
    return 'gte';
  }, [value]);

  const toOperator = useMemo(() => {
    if (value.lte !== undefined) return 'lte';
    if (value.lt !== undefined) return 'lt';
    return 'lte';
  }, [value]);

  const fromValue =
    value.gte !== undefined ? String(value.gte) : value.gt !== undefined ? String(value.gt) : '';
  const toValue =
    value.lte !== undefined ? String(value.lte) : value.lt !== undefined ? String(value.lt) : '';

  const fromInclusive = fromOperator === 'gte';
  const toInclusive = toOperator === 'lte';

  const handleFromChange = useCallback(
    (fieldValue: string) => {
      const updatedRange = { ...value };

      // Remove both gt and gte
      delete updatedRange.gt;
      delete updatedRange.gte;

      if (fieldValue !== '') {
        // Use the current checkbox state to determine which operator to use
        if (fromInclusive) {
          updatedRange.gte = fieldValue;
        } else {
          updatedRange.gt = fieldValue;
        }
      }

      onChange(updatedRange);
    },
    [value, onChange, fromInclusive]
  );

  const handleToChange = useCallback(
    (fieldValue: string) => {
      const updatedRange = { ...value };

      // Remove both lt and lte
      delete updatedRange.lt;
      delete updatedRange.lte;

      if (fieldValue !== '') {
        // Use the current checkbox state to determine which operator to use
        if (toInclusive) {
          updatedRange.lte = fieldValue;
        } else {
          updatedRange.lt = fieldValue;
        }
      }

      onChange(updatedRange);
    },
    [value, onChange, toInclusive]
  );

  const handleFromInclusiveChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const updatedRange = { ...value };
      const currentValue = fromValue;

      // Remove both operators
      delete updatedRange.gt;
      delete updatedRange.gte;

      // Always set the operator based on checkbox state, even if value is empty
      // This ensures the checkbox state is preserved for when a value is entered
      if (e.target.checked) {
        updatedRange.gte = currentValue;
      } else {
        updatedRange.gt = currentValue;
      }

      onChange(updatedRange);
    },
    [value, onChange, fromValue]
  );

  const handleToInclusiveChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const updatedRange = { ...value };
      const currentValue = toValue;

      // Remove both operators
      delete updatedRange.lt;
      delete updatedRange.lte;

      // Always set the operator based on checkbox state, even if value is empty
      // This ensures the checkbox state is preserved for when a value is entered
      if (e.target.checked) {
        updatedRange.lte = currentValue;
      } else {
        updatedRange.lt = currentValue;
      }

      onChange(updatedRange);
    },
    [value, onChange, toValue]
  );

  const fromCheckbox = (
    <EuiToolTip
      content={i18n.translate('xpack.streams.rangeInput.fromInclusiveTooltip', {
        defaultMessage: 'Include',
      })}
    >
      <span>
        <EuiCheckbox
          id={`${dataTestSubj}-from-inclusive`}
          checked={fromInclusive}
          onChange={handleFromInclusiveChange}
          disabled={disabled}
          data-test-subj={`${dataTestSubj}-from-inclusive`}
          label={i18n.translate('xpack.streams.rangeInput.incLabel', {
            defaultMessage: 'Inc',
          })}
        />
      </span>
    </EuiToolTip>
  ) as unknown as EuiComboBoxProps<string>['prepend'];

  const toCheckbox = (
    <EuiToolTip
      content={i18n.translate('xpack.streams.rangeInput.toInclusiveTooltip', {
        defaultMessage: 'Include',
      })}
    >
      <span>
        <EuiCheckbox
          id={`${dataTestSubj}-to-inclusive`}
          checked={toInclusive}
          onChange={handleToInclusiveChange}
          disabled={disabled}
          data-test-subj={`${dataTestSubj}-to-inclusive`}
          label={i18n.translate('xpack.streams.rangeInput.incLabel', {
            defaultMessage: 'Inc',
          })}
        />
      </span>
    </EuiToolTip>
  ) as unknown as EuiComboBoxProps<string>['prepend'];

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={1} style={{ minWidth: '120px' }}>
        <AutocompleteSelector
          value={fromValue}
          onChange={handleFromChange}
          placeholder={i18n.translate('xpack.streams.rangeInput.fromPlaceholder', {
            defaultMessage: 'From',
          })}
          suggestions={valueSuggestions}
          compressed={compressed}
          disabled={disabled}
          dataTestSubj={`${dataTestSubj}-from`}
          prepend={fromCheckbox}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={1} style={{ minWidth: '120px' }}>
        <AutocompleteSelector
          value={toValue}
          onChange={handleToChange}
          placeholder={i18n.translate('xpack.streams.rangeInput.toPlaceholder', {
            defaultMessage: 'To',
          })}
          suggestions={valueSuggestions}
          compressed={compressed}
          disabled={disabled}
          dataTestSubj={`${dataTestSubj}-to`}
          prepend={toCheckbox}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
