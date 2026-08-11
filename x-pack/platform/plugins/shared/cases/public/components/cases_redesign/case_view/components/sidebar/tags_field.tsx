/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { useGetTags } from '../../../../../containers/use_get_tags';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { MAX_LENGTH_PER_TAG, MAX_TAGS_PER_CASE } from '../../../../../../common/constants';
import {
  validateEmptyTags,
  validateMaxLength,
  validateMaxTagsLength,
} from '../../../../case_form_fields/utils';
import * as i18n from '../../../../../common/translations';

export interface TagsFieldProps {
  isLoading: boolean;
  onSubmit: (tags: string[]) => void;
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
  const [error, setError] = useState<string | null>(null);

  const { data: tagOptions = [] } = useGetTags();
  const options = useMemo(() => tagOptions.map((label) => ({ label })), [tagOptions]);

  const selectedOptions = useMemo(
    () => tags.map((label): EuiComboBoxOptionOption => ({ label })),
    [tags]
  );

  // Each add/remove persists on its own rather than behind a confirm step: the combo box already
  // states the resulting set, so the extra step only delayed it. The field renders the committed
  // `tags` prop, so a failed update reverts by simply never arriving.
  const commitTags = useCallback(
    (nextTags: string[]) => {
      const maxTagsError = validateMaxTagsLength({
        value: nextTags,
        message: i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_CASE),
        limit: MAX_TAGS_PER_CASE,
      })?.message;

      if (maxTagsError) {
        setError(maxTagsError);
        return;
      }

      setError(null);
      onSubmit(nextTags.map((tag) => tag.trim()));
    },
    [onSubmit]
  );

  const onChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      commitTags(selected.map((option) => String(option.label)));
    },
    [commitTags]
  );

  const onCreateOption = useCallback(
    (newTag: string) => {
      const newTagError = validateNewTag(newTag);

      if (newTagError) {
        setError(newTagError);
        return false;
      }

      commitTags([...tags, newTag]);
    },
    [commitTags, tags]
  );

  const onSearchChange = useCallback(() => setError(null), []);

  return (
    <EuiFlexItem grow={false} data-test-subj="case-tags">
      <EuiFormRow
        label={i18n.TAGS}
        helpText={i18n.TAGS_HELP}
        error={error ?? undefined}
        isInvalid={error != null}
        fullWidth
        data-test-subj="caseTags"
      >
        <EuiComboBox
          isInvalid={error != null}
          fullWidth
          placeholder=""
          noSuggestions={false}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onChange}
          onCreateOption={onCreateOption}
          onSearchChange={onSearchChange}
          isDisabled={isLoading || !permissions.update}
          isLoading={isLoading}
          customOptionText={i18n.ADD_TAG_CUSTOM_OPTION_LABEL_COMBO_BOX}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
TagsField.displayName = 'TagsField';
