/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { Field } from '../../../types';

export interface InlineOptionalDateFormatFieldLabels {
  label: string;
  helpText?: string;
  placeholder?: string;
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
  const { label, helpText, placeholder } = { ...defaultLabels, ...labels };

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      fullWidth
      data-test-subj="inlineOptionalDateFormat"
    >
      <EuiFieldText
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        fullWidth
        data-test-subj="inlineOptionalDateFormatInput"
      />
    </EuiFormRow>
  );
};
