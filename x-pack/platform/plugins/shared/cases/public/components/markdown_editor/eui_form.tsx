/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef } from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { MarkdownEditorLayoutProps } from './markdown_editor_layout';
import { MarkdownEditorLayout } from './markdown_editor_layout';
import type { MarkdownEditorRef } from './types';

type MarkdownEditorFormProps = Omit<
  MarkdownEditorLayoutProps,
  'control' | 'label' | 'labelAppend' | 'helpText' | 'isInvalid' | 'errorMessage'
> & {
  field: FieldHook<string>;
};

/** hook_form_lib adapter of the markdown editor; new forms should use `MarkdownField`. */
export const MarkdownEditorForm = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorFormProps>(({ field, ...props }, ref) => {
    const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

    return (
      <MarkdownEditorLayout
        {...props}
        ref={ref}
        control={field}
        label={field.label}
        labelAppend={field.labelAppend}
        helpText={field.helpText}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
      />
    );
  })
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
