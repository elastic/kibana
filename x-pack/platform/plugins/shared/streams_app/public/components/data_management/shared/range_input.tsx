/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
 * Internally uses gte (greater than or equals) for "from" and lt (less than) for "to".
 */
export const RangeInput: React.FC<RangeInputProps> = ({
  value,
  onChange,
  valueSuggestions = [],
  disabled = false,
  compressed = false,
  dataTestSubj = 'streamsAppRangeInput',
}) => {
  const handleFromChange = useCallback(
    (fieldValue: string) => {
      const updatedRange = { ...value };

      if (fieldValue === '') {
        delete updatedRange.gte;
      } else {
        updatedRange.gte = fieldValue;
      }

      onChange(updatedRange);
    },
    [value, onChange]
  );

  const handleToChange = useCallback(
    (fieldValue: string) => {
      const updatedRange = { ...value };

      if (fieldValue === '') {
        delete updatedRange.lt;
      } else {
        updatedRange.lt = fieldValue;
      }

      onChange(updatedRange);
    },
    [value, onChange]
  );

  // Convert range values to strings for display
  const fromValue = value.gte !== undefined ? String(value.gte) : '';
  const toValue = value.lt !== undefined ? String(value.lt) : '';

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj={dataTestSubj}>
      <EuiFlexItem grow={1}>
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
        />
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
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
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
