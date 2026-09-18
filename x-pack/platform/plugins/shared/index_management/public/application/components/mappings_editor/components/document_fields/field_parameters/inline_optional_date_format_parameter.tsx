/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge, EuiCode, EuiComboBox, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Field } from '../../../types';

export interface InlineOptionalDateFormatFieldLabels {
  label: string;
  helpText?: string;
  placeholder?: string;
  presets?: ReadonlyArray<{ value: string; label: string }>;
  defaultPresetValue?: string;
  defaultPresetLiteral?: string;
}

interface Props {
  labels: InlineOptionalDateFormatFieldLabels;
  value: string;
  onChange: (nextValue: string) => void;
}

const defaultLabels: InlineOptionalDateFormatFieldLabels = {
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.inlineOptionalDateFormatLabel', {
    defaultMessage: 'Format (optional)',
  }),
  helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.inlineOptionalDateFormatHelp', {
    defaultMessage: 'Pattern for text timestamps.',
  }),
  placeholder: i18n.translate('xpack.idxMgmt.mappingsEditor.inlineOptionalDateFormatPlaceholder', {
    defaultMessage: 'e.g. yyyy-MM-dd HH:mm:ss.SSS',
  }),
};

const buildSelectedOptions = (
  value: string,
  comboBoxOptions: Array<EuiComboBoxOptionOption<string>>
): Array<EuiComboBoxOptionOption<string>> => {
  if (!value) {
    return [];
  }

  const matchingOption = comboBoxOptions.find((option) => option.value === value);

  return [{ label: matchingOption?.label ?? value, value }];
};

const DefaultOptionBadge = () => (
  <EuiBadge color="hollow" data-test-subj="inlineOptionalDateFormatDefaultOptionBadge">
    {i18n.translate('xpack.idxMgmt.mappingsEditor.inlineOptionalDateFormatDefaultBadge', {
      defaultMessage: 'Default',
    })}
  </EuiBadge>
);

const InlineOptionalDateFormatHelpText = ({
  defaultPresetLiteral,
}: {
  defaultPresetLiteral?: string;
}) =>
  defaultPresetLiteral ? (
    <FormattedMessage
      id="xpack.idxMgmt.mappingsEditor.inlineOptionalDateFormatDefaultHelp"
      defaultMessage="{value} by default."
      values={{ value: <EuiCode>{defaultPresetLiteral}</EuiCode> }}
    />
  ) : undefined;

export const isInlineOptionalDateFormatMappingType = (mappingType: string | undefined): boolean =>
  mappingType === 'date' || mappingType === 'date_nanos';

export const readInlineOptionalDateFormatFromField = (format: Field['format']): string => {
  if (typeof format !== 'string') {
    return '';
  }

  return format;
};

export const applyInlineOptionalDateFormatToField = (
  fieldData: Field,
  mappingType: string | undefined,
  formatText: string
): Field => {
  if (!isInlineOptionalDateFormatMappingType(mappingType)) {
    return fieldData;
  }

  const trimmedFormat = formatText.trim();
  if (!trimmedFormat) {
    const { format: _removed, ...fieldWithoutFormat } = fieldData;
    return fieldWithoutFormat as Field;
  }

  return {
    ...fieldData,
    format: trimmedFormat,
  };
};

export const InlineOptionalDateFormatParameter = ({ labels, value, onChange }: Props) => {
  const {
    label,
    helpText,
    placeholder,
    presets,
    defaultPresetValue,
    defaultPresetLiteral,
  } = {
    ...defaultLabels,
    ...labels,
  };

  const resolvedHelpText = (
    <InlineOptionalDateFormatHelpText defaultPresetLiteral={defaultPresetLiteral} />
  );

  const comboBoxOptions = useMemo(
    () =>
      (presets ?? []).map((preset) => ({
        label: preset.label,
        value: preset.value,
        ...(preset.value === defaultPresetValue ? { append: <DefaultOptionBadge /> } : {}),
      })),
    [defaultPresetValue, presets]
  );

  const selectedOptions = useMemo(
    () => buildSelectedOptions(value, comboBoxOptions),
    [comboBoxOptions, value]
  );

  const handleSelectionChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(newSelectedOptions[0]?.value ?? '');
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedValue = searchValue.trim();
      if (normalizedValue) {
        handleSelectionChange([{ label: normalizedValue, value: normalizedValue }]);
      }
    },
    [handleSelectionChange]
  );

  const usePresetComboBox = (presets?.length ?? 0) > 0;

  return (
    <EuiFormRow
      label={label}
      helpText={resolvedHelpText}
      fullWidth
      data-test-subj="inlineOptionalDateFormat"
    >
      {usePresetComboBox ? (
        <EuiComboBox
          options={comboBoxOptions}
          selectedOptions={selectedOptions}
          onChange={handleSelectionChange}
          onCreateOption={handleCreateOption}
          data-test-subj="inlineOptionalDateFormatInput"
          fullWidth
          isClearable
          aria-label={label}
          placeholder={placeholder}
          singleSelection={{ asPlainText: true }}
          customOptionText={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.inlineOptionalDateFormatCustomOption',
            {
              defaultMessage: 'Add {searchValue} as a custom option',
            }
          )}
        />
      ) : (
        <EuiFieldText
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          fullWidth
          data-test-subj="inlineOptionalDateFormatInput"
        />
      )}
    </EuiFormRow>
  );
};
