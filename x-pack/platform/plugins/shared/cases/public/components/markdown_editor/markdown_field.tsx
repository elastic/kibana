/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import { useController } from 'react-hook-form';
import type { MarkdownEditorLayoutProps } from './markdown_editor_layout';
import { MarkdownEditorLayout } from './markdown_editor_layout';
import type { MarkdownEditorRef } from './types';

type MarkdownFieldProps = Omit<
  MarkdownEditorLayoutProps,
  'control' | 'isInvalid' | 'errorMessage'
> & {
  /** react-hook-form field path; the value is a markdown `string`. */
  name: string;
};

/** react-hook-form markdown editor: reads the form from `FormProvider`, errors come from the resolver. */
export const MarkdownField = forwardRef<MarkdownEditorRef, MarkdownFieldProps>(
  ({ name, ...props }, ref) => {
    const {
      field: { value, onChange, onBlur },
      fieldState: { error },
    } = useController<Record<string, string | undefined>>({ name });

    const control = useMemo(() => ({ value: value ?? '', setValue: onChange }), [value, onChange]);

    return (
      <MarkdownEditorLayout
        {...props}
        ref={ref}
        control={control}
        onBlur={onBlur}
        isInvalid={Boolean(error)}
        errorMessage={error?.message ?? null}
      />
    );
  }
);

MarkdownField.displayName = 'MarkdownField';
