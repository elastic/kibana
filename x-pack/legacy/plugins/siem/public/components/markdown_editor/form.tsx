/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { useCallback } from 'react';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../shared_imports';
import { MarkdownEditor } from '.';

interface IMarkdownEditorForm {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
  placeholder?: string;
  footerContentRight?: React.ReactNode;
}
export const MarkdownEditorForm = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled = false,
  placeholder,
  footerContentRight,
}: IMarkdownEditorForm) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const handleContentChange = useCallback(
    (newContent: string) => {
      field.setValue(newContent);
    },
    [field]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <MarkdownEditor
        initialContent={field.value as string}
        isDisabled={isDisabled}
        footerContentRight={footerContentRight}
        onChange={handleContentChange}
        placeholder={placeholder}
      />
    </EuiFormRow>
  );
};
