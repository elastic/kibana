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
  bottomRightContent?: React.ReactNode;
  topRightContent?: React.ReactNode;
  idAria: string;
  isDisabled: boolean;
  placeholder?: string;
}
export const MarkdownEditorForm = ({
  bottomRightContent,
  dataTestSubj,
  field,
  idAria,
  isDisabled = false,
  placeholder,
  topRightContent,
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
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      error={errorMessage}
      fullWidth
      helpText={field.helpText}
      isInvalid={isInvalid}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <MarkdownEditor
        bottomRightContent={bottomRightContent}
        topRightContent={topRightContent}
        initialContent={field.value as string}
        isDisabled={isDisabled}
        onChange={handleContentChange}
        placeholder={placeholder}
      />
    </EuiFormRow>
  );
};
