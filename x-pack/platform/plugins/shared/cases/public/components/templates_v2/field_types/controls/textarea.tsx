/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React, { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiTextArea, EuiMarkdownEditor } from '@elastic/eui';
import { InlineFieldActions } from './inline_field_actions';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  TextareaFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import {
  FIELD_REQUIRED,
  FIELD_MIN_LENGTH,
  FIELD_MAX_LENGTH,
  FIELD_PATTERN_MISMATCH,
  FIELD_PATTERN_INVALID,
} from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

type TextareaProps = z.infer<typeof TextareaFieldSchema> & ConditionRenderProps;

export const Textarea = ({
  label,
  name,
  type,
  metadata,
  isRequired,
  patternValidation,
  minLength,
  maxLength,
  onConfirm,
  isSaving,
  isSaveDisabled,
}: TextareaProps) => {
  const { control, resetField } = useFormContext();
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;
  const isMarkdown = metadata?.markdown === true;

  const handleCancel = useCallback(() => {
    resetField(path);
  }, [path, resetField]);

  const rules = useMemo(() => {
    const validate: Record<string, (value: unknown) => true | string> = {};

    if (isRequired) {
      validate.required = (value) =>
        typeof value === 'string' && value.trim() !== '' ? true : FIELD_REQUIRED;
    }

    if (patternValidation) {
      const { regex, message } = patternValidation;
      validate.pattern = (value) => {
        if (typeof value !== 'string' || value === '') return true;
        try {
          return new RegExp(regex).test(value) ? true : message ?? FIELD_PATTERN_MISMATCH(regex);
        } catch {
          return FIELD_PATTERN_INVALID;
        }
      };
    }

    if (minLength !== undefined) {
      validate.minLength = (value) =>
        typeof value === 'string' && value.length < minLength ? FIELD_MIN_LENGTH(minLength) : true;
    }

    if (maxLength !== undefined) {
      validate.maxLength = (value) =>
        typeof value === 'string' && value.length > maxLength ? FIELD_MAX_LENGTH(maxLength) : true;
    }

    return { validate };
  }, [isRequired, patternValidation, minLength, maxLength]);

  return (
    <Controller
      key={name}
      name={path}
      control={control}
      rules={rules}
      defaultValue=""
      render={({ field, fieldState }) => {
        const showInlineActions = fieldState.isDirty && onConfirm != null;
        return (
          <>
            <EuiFormRow
              label={label}
              labelAppend={!isRequired ? OptionalFieldLabel : undefined}
              isInvalid={Boolean(fieldState.error)}
              error={fieldState.error?.message}
              fullWidth
            >
              {isMarkdown ? (
                <EuiMarkdownEditor
                  value={(field.value as string) ?? ''}
                  onChange={field.onChange}
                  aria-label={typeof label === 'string' ? label : name}
                  editorId={path}
                  data-test-subj="template-field-markdown-editor"
                  readOnly={isSaving}
                />
              ) : (
                <EuiTextArea
                  inputRef={field.ref}
                  name={field.name}
                  value={(field.value as string) ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isInvalid={Boolean(fieldState.error)}
                  disabled={isSaving}
                  fullWidth
                />
              )}
            </EuiFormRow>
            {showInlineActions && onConfirm && (
              <InlineFieldActions
                name={name}
                onConfirm={onConfirm}
                onCancel={handleCancel}
                isLoading={isSaving}
                isDisabled={isSaveDisabled}
              />
            )}
          </>
        );
      }}
    />
  );
};
Textarea.displayName = 'Textarea';
