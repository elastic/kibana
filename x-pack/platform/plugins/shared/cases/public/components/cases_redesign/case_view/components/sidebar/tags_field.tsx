/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { Controller, useForm } from 'react-hook-form';
import { useGetTags } from '../../../../../containers/use_get_tags';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { MAX_LENGTH_PER_TAG, MAX_TAGS_PER_CASE } from '../../../../../../common/constants';
import {
  validateEmptyTags,
  validateMaxLength,
  validateMaxTagsLength,
} from '../../../../case_form_fields/utils';
import * as i18n from '../../../../../common/translations';
import { InlineFieldActions } from '../../../../templates_v2/field_types/controls/inline_field_actions';

export interface TagsFieldProps {
  isLoading: boolean;
  onSubmit: (tags: string[]) => void;
  tags: string[];
}

interface TagsFormValues {
  tags: string[];
}

const validateNewTag = (value: string): string | null =>
  validateEmptyTags({ value, message: i18n.TAGS_EMPTY_ERROR })?.message ??
  validateMaxLength({
    value,
    message: i18n.MAX_LENGTH_ERROR('tag', MAX_LENGTH_PER_TAG),
    limit: MAX_LENGTH_PER_TAG,
  })?.message ??
  null;

export const TagsField: React.FC<TagsFieldProps> = ({ isLoading, onSubmit, tags }) => {
  const { permissions } = useCasesContext();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { isDirty },
  } = useForm<TagsFormValues>({ defaultValues: { tags } });

  const { data: tagOptions = [] } = useGetTags();
  const options = useMemo(() => tagOptions.map((label) => ({ label })), [tagOptions]);

  // Read isDirty through a ref so this effect only reacts to the `tags` prop itself
  // changing (e.g. an external update), and not to the dirty state flipping back to
  // false as a side effect of the confirm/cancel handlers resetting the form.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!isDirtyRef.current) {
      reset({ tags });
    }
  }, [tags, reset]);

  const onConfirm = handleSubmit(({ tags: submittedTags }) => {
    const trimmedTags = submittedTags.map((tag) => tag.trim());
    onSubmit(trimmedTags);
    // Reset to the current `tags` prop rather than the just-submitted value: the mutation
    // triggered by `onSubmit` is fire-and-forget from here, so until it actually resolves and
    // the prop updates, we should keep showing the last-known-good value instead of assuming
    // success. If the mutation fails, the prop never changes and this correctly reverts.
    reset({ tags });
  });

  const onCancel = useCallback(() => {
    reset({ tags });
  }, [reset, tags]);

  return (
    <EuiFlexItem grow={false} data-test-subj="case-tags">
      <Controller
        name="tags"
        control={control}
        rules={{
          validate: (value) =>
            validateMaxTagsLength({
              value,
              message: i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_CASE),
              limit: MAX_TAGS_PER_CASE,
            })?.message ?? true,
        }}
        render={({ field, fieldState }) => (
          <EuiFormRow
            label={i18n.TAGS}
            helpText={i18n.TAGS_HELP}
            error={fieldState.error?.message}
            isInvalid={!!fieldState.error}
            fullWidth
            data-test-subj="caseTags"
          >
            <EuiComboBox
              inputRef={field.ref}
              isInvalid={!!fieldState.error}
              fullWidth
              placeholder=""
              noSuggestions={false}
              options={options}
              selectedOptions={field.value.map((label): EuiComboBoxOptionOption => ({ label }))}
              onChange={(selected) => {
                clearErrors('tags');
                field.onChange(selected.map((option) => option.label));
              }}
              onCreateOption={(newTag) => {
                const error = validateNewTag(newTag);

                if (error) {
                  setError('tags', { type: 'manual', message: error });
                  return false;
                }

                clearErrors('tags');
                field.onChange([...field.value, newTag]);
              }}
              onSearchChange={() => clearErrors('tags')}
              isDisabled={isLoading || !permissions.update}
              isLoading={isLoading}
              customOptionText={i18n.ADD_TAG_CUSTOM_OPTION_LABEL_COMBO_BOX}
            />
          </EuiFormRow>
        )}
      />
      {isDirty && !isLoading && (
        <InlineFieldActions name="tags" onConfirm={onConfirm} onCancel={onCancel} />
      )}
    </EuiFlexItem>
  );
};
TagsField.displayName = 'TagsField';
