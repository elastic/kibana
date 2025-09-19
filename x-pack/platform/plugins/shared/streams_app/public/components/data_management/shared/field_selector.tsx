/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiComboBox, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useSimulatorSelector } from '../stream_detail_enrichment/state_management/stream_enrichment_state_machine';
import { selectUnsupportedDottedFields } from '../stream_detail_enrichment/state_management/simulation_state_machine/selectors';
import { useFieldSuggestions } from '../stream_detail_enrichment/steps/blocks/action/hooks/use_field_suggestions';
import type { FieldSuggestion } from '../stream_detail_enrichment/steps/blocks/action/utils/field_suggestions';

export interface FieldSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  compressed?: boolean;
  fullWidth?: boolean;
  processorType?: string;
  showUnsupportedFieldsWarning?: boolean;
  dataTestSubj?: string;
  isInvalid?: boolean;
  error?: string;
}

/**
 * Generalized field selector component with autocomplete suggestions
 */
export const FieldSelector = ({
  value,
  onChange,
  label,
  helpText,
  placeholder,
  disabled = false,
  compressed = false,
  fullWidth = false,
  processorType,
  showUnsupportedFieldsWarning = true,
  dataTestSubj = 'streamsAppFieldSelector',
  isInvalid,
  error,
}: FieldSelectorProps) => {
  const { euiTheme } = useEuiTheme();

  const unsupportedFields = useSimulatorSelector((state) =>
    selectUnsupportedDottedFields(state.context)
  );

  const suggestions = useFieldSuggestions(processorType);

  const selectedOptions = useMemo(() => {
    if (!value) return [];

    const matchingSuggestion = suggestions.find((s) => s.value?.name === value);
    return matchingSuggestion ? [matchingSuggestion] : [{ label: value, value: { name: value } }];
  }, [value, suggestions]);

  const handleSelectionChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<FieldSuggestion>>) => {
      const selectedOption = newSelectedOptions[0];
      const newFieldValue = selectedOption?.value?.name || '';
      onChange?.(newFieldValue);
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedValue = searchValue.trim();
      if (normalizedValue) {
        handleSelectionChange([{ label: normalizedValue, value: { name: normalizedValue } }]);
      }
    },
    [handleSelectionChange]
  );

  const isUnsupported = useMemo(
    () =>
      showUnsupportedFieldsWarning && value && unsupportedFields.some((f) => value.startsWith(f)),
    [value, unsupportedFields, showUnsupportedFieldsWarning]
  );

  // Default labels
  const defaultLabel = i18n.translate('xpack.streams.fieldSelector.defaultLabel', {
    defaultMessage: 'Field',
  });

  const defaultPlaceholder = i18n.translate('xpack.streams.fieldSelector.defaultPlaceholder', {
    defaultMessage: 'Select or type a field name...',
  });

  return (
    <>
      <EuiFormRow
        label={label ?? defaultLabel}
        helpText={helpText}
        isInvalid={isInvalid}
        error={error}
        fullWidth={fullWidth}
      >
        <EuiComboBox
          data-test-subj={dataTestSubj}
          placeholder={placeholder ?? defaultPlaceholder}
          options={suggestions}
          selectedOptions={selectedOptions}
          onChange={handleSelectionChange}
          onCreateOption={handleCreateOption}
          singleSelection={{ asPlainText: true }}
          isInvalid={isInvalid}
          isDisabled={disabled}
          compressed={compressed}
          isClearable
          fullWidth={fullWidth}
          customOptionText={i18n.translate('xpack.streams.fieldSelector.customOptionText', {
            defaultMessage: 'Add {searchValue} as a custom field',
            values: { searchValue: '{searchValue}' },
          })}
        />
      </EuiFormRow>

      {isUnsupported && (
        <EuiCallOut
          color="warning"
          iconType="alert"
          title={i18n.translate('xpack.streams.fieldSelector.unsupportedFieldsWarning.title', {
            defaultMessage: 'Dot-separated field names are not supported.',
          })}
          css={css`
            margin-top: ${euiTheme.size.s};
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          <p>
            {i18n.translate('xpack.streams.fieldSelector.unsupportedFieldsWarning.p1', {
              defaultMessage: 'Dot-separated field names can produce misleading results.',
            })}
          </p>
          <p>
            {i18n.translate('xpack.streams.fieldSelector.unsupportedFieldsWarning.p2', {
              defaultMessage:
                'For accurate results, avoid dot-separated field names or expand them into nested objects.',
            })}
          </p>
        </EuiCallOut>
      )}
    </>
  );
};
