/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiText } from '@elastic/eui';
import { EditableFieldWrapper } from './editable_field_wrapper';
import * as i18n from '../translations';

export interface EditNumberFieldProps {
  title: string;
  value: string;
  onSubmit: (value: string) => void;
  isLoading: boolean;
  'data-test-subj'?: string;
}

export const EditNumberField = React.memo<EditNumberFieldProps>(
  ({ title, value, onSubmit, isLoading, 'data-test-subj': dataTestSubj = 'edit-number-field' }) => (
    <EditableFieldWrapper<string>
      title={title}
      value={value}
      isLoading={isLoading}
      onSubmit={onSubmit}
      displayContent={
        <EuiText size="s" data-test-subj={`${dataTestSubj}-value`}>
          {value || i18n.FIELD_NOT_DEFINED}
        </EuiText>
      }
      data-test-subj={dataTestSubj}
    >
      {(editValue, setEditValue) => (
        <EuiFieldNumber
          fullWidth
          data-test-subj={`${dataTestSubj}-input`}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
      )}
    </EditableFieldWrapper>
  )
);

EditNumberField.displayName = 'EditNumberField';
