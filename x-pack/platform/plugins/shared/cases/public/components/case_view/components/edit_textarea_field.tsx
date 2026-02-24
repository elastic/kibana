/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextArea, EuiText } from '@elastic/eui';
import { EditableFieldWrapper } from './editable_field_wrapper';

export interface EditTextareaFieldProps {
  title: string;
  value: string;
  onSubmit: (value: string) => void;
  isLoading: boolean;
  'data-test-subj'?: string;
}

export const EditTextareaField = React.memo<EditTextareaFieldProps>(
  ({
    title,
    value,
    onSubmit,
    isLoading,
    'data-test-subj': dataTestSubj = 'edit-textarea-field',
  }) => (
    <EditableFieldWrapper<string>
      title={title}
      value={value}
      isLoading={isLoading}
      onSubmit={(val) => onSubmit(val.trim())}
      displayContent={
        <EuiText size="s" data-test-subj={`${dataTestSubj}-value`}>
          {value || '---'}
        </EuiText>
      }
      data-test-subj={dataTestSubj}
    >
      {(editValue, setEditValue) => (
        <EuiTextArea
          fullWidth
          data-test-subj={`${dataTestSubj}-input`}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
      )}
    </EditableFieldWrapper>
  )
);

EditTextareaField.displayName = 'EditTextareaField';
