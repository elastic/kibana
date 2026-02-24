/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiText } from '@elastic/eui';
import { EditableFieldWrapper } from './editable_field_wrapper';
import * as i18n from '../translations';

export interface EditComboboxFieldProps {
  title: string;
  value: string[];
  options: string[];
  onSubmit: (value: string[]) => void;
  isLoading: boolean;
  singleSelection?: boolean;
  'data-test-subj'?: string;
}

export const EditComboboxField = React.memo<EditComboboxFieldProps>(
  ({
    title,
    value,
    options,
    onSubmit,
    isLoading,
    singleSelection = false,
    'data-test-subj': dataTestSubj = 'edit-combobox-field',
  }) => {
    const comboBoxOptions: EuiComboBoxOptionOption[] = useMemo(
      () => options.map((opt) => ({ label: opt })),
      [options]
    );

    return (
      <EditableFieldWrapper<string[]>
        title={title}
        value={value}
        isLoading={isLoading}
        onSubmit={onSubmit}
        displayContent={
          <EuiText size="s" data-test-subj={`${dataTestSubj}-value`}>
            {value.length > 0 ? value.join(', ') : i18n.FIELD_NOT_DEFINED}
          </EuiText>
        }
        data-test-subj={dataTestSubj}
      >
        {(editValue, setEditValue) => (
          <EuiComboBox
            fullWidth
            aria-label={title}
            data-test-subj={`${dataTestSubj}-input`}
            options={comboBoxOptions}
            selectedOptions={comboBoxOptions.filter((opt) => editValue.includes(opt.label))}
            onChange={(selected) => setEditValue(selected.map((opt) => opt.label))}
            singleSelection={singleSelection ? { asPlainText: true } : undefined}
            isClearable
          />
        )}
      </EditableFieldWrapper>
    );
  }
);

EditComboboxField.displayName = 'EditComboboxField';
