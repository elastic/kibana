/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldText,
  EuiSwitch,
  keys,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EsqlToolFieldType } from '@kbn/agent-builder-common';
import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import moment from 'moment';
import React from 'react';
import { parseArrayEntry } from '../../../execute/test_tools';

// Returns the appropriate empty/default value for a given field type.
export const getEmptyValue = (fieldType: EsqlToolFieldType): EsqlToolParamValue => {
  switch (fieldType) {
    case EsqlToolFieldType.BOOLEAN:
      return false;
    case EsqlToolFieldType.ARRAY:
      return [];
    default:
      return '';
  }
};

export interface EsqlParamValueInputProps {
  type: EsqlToolFieldType;
  value: EsqlToolParamValue | undefined;
  onChange: (value: EsqlToolParamValue | undefined) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  disabled?: boolean;
  compressed?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  isInvalid?: boolean;
  'data-test-subj'?: string;
}

export const EsqlParamValueInput: React.FC<EsqlParamValueInputProps> = ({
  type,
  value,
  onChange,
  inputRef,
  disabled = false,
  compressed = false,
  fullWidth = false,
  placeholder,
  isInvalid,
  'data-test-subj': dataTestSubj,
}) => {
  switch (type) {
    case EsqlToolFieldType.INTEGER:
    case EsqlToolFieldType.FLOAT:
      return (
        <EuiFieldNumber
          inputRef={inputRef}
          compressed={compressed}
          fullWidth={fullWidth}
          disabled={disabled}
          placeholder={placeholder}
          isInvalid={isInvalid}
          value={typeof value === 'number' ? value : ''}
          step={type === EsqlToolFieldType.INTEGER ? 1 : undefined}
          onChange={(e) => {
            if (e.target.value === '') {
              onChange('');
            } else if (Number.isFinite(e.target.valueAsNumber)) {
              onChange(e.target.valueAsNumber);
            }
          }}
          data-test-subj={dataTestSubj}
        />
      );

    case EsqlToolFieldType.BOOLEAN:
      return (
        <EuiSwitch
          compressed={compressed}
          disabled={disabled}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          label={placeholder ?? ''}
          showLabel={false}
          data-test-subj={dataTestSubj}
        />
      );

    case EsqlToolFieldType.DATE:
      return (
        <EuiDatePicker
          showTimeSelect
          showIcon={false}
          fullWidth={fullWidth}
          disabled={disabled}
          isInvalid={isInvalid}
          selected={value ? moment(value as string) : undefined}
          onChange={(date) => onChange(date ? date.toISOString() : undefined)}
          css={
            compressed &&
            css`
              .euiFormControlLayout {
                block-size: 32px;
              }
              .euiFieldText {
                block-size: 32px;
              }
            `
          }
          data-test-subj={dataTestSubj}
        />
      );

    case EsqlToolFieldType.ARRAY: {
      const arrayValue: Array<string | number> = Array.isArray(value) ? value : [];
      const selectedOptions: Array<EuiComboBoxOptionOption<string | number>> = arrayValue.map(
        (item) => ({
          label: String(item),
          value: item,
        })
      );

      return (
        <EuiComboBox<string | number>
          options={[]}
          selectedOptions={selectedOptions}
          onChange={(selected) => {
            onChange(selected.map((opt) => opt.value ?? opt.label) as string[] | number[]);
          }}
          onCreateOption={(searchValue) => {
            const newValue = parseArrayEntry(searchValue);
            if (newValue === undefined) return;
            onChange([...arrayValue, newValue] as string[] | number[]);
          }}
          aria-label={placeholder ?? 'Array values'}
          compressed={compressed}
          fullWidth={fullWidth}
          isDisabled={disabled}
          isInvalid={isInvalid}
          noSuggestions
          delimiter=","
          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === keys.ENTER) {
              event.preventDefault();
            }
          }}
          data-test-subj={dataTestSubj}
        />
      );
    }

    case EsqlToolFieldType.STRING:
      return (
        <EuiFieldText
          inputRef={inputRef}
          compressed={compressed}
          fullWidth={fullWidth}
          disabled={disabled}
          placeholder={placeholder}
          isInvalid={isInvalid}
          value={value != null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          data-test-subj={dataTestSubj}
        />
      );
  }
};
