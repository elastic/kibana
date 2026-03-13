/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_TAGS_PER_ACTION, MAX_TAG_LENGTH } from '../../../common/constants';
import { useHistoryTags } from '../use_history_tags';

const TAGS_LABEL = i18n.translate('xpack.osquery.tagsEditor.label', {
  defaultMessage: 'Tags',
});

const TAGS_PLACEHOLDER = i18n.translate('xpack.osquery.tagsEditor.placeholder', {
  defaultMessage: 'Add tags...',
});

const CUSTOM_OPTION_TEXT = i18n.translate('xpack.osquery.tagsEditor.customOptionText', {
  defaultMessage: 'Add {searchValue} as a tag',
  values: { searchValue: '{searchValue}' },
});

interface TagsEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  isDisabled?: boolean;
  fullWidth?: boolean;
}

const TagsEditorComponent: React.FC<TagsEditorProps> = ({
  tags,
  onChange,
  isDisabled = false,
  fullWidth = true,
}) => {
  const { tags: availableTags } = useHistoryTags();

  const selectedOptions: EuiComboBoxOptionOption[] = useMemo(
    () => tags.map((tag) => ({ label: tag, key: tag })),
    [tags]
  );

  const options: EuiComboBoxOptionOption[] = useMemo(() => {
    const tagSet = new Set(tags);

    return availableTags.filter((tag) => !tagSet.has(tag)).map((tag) => ({ label: tag, key: tag }));
  }, [availableTags, tags]);

  const handleChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      onChange(newOptions.map((opt) => opt.label));
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length > MAX_TAG_LENGTH || tags.length >= MAX_TAGS_PER_ACTION) {
        return false;
      }

      if (tags.includes(trimmed)) {
        return false;
      }

      onChange([...tags, trimmed]);

      return true;
    },
    [tags, onChange]
  );

  return (
    <EuiFormRow label={TAGS_LABEL} fullWidth={fullWidth}>
      <EuiComboBox
        placeholder={TAGS_PLACEHOLDER}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        customOptionText={CUSTOM_OPTION_TEXT}
        isClearable
        isDisabled={isDisabled}
        fullWidth={fullWidth}
        data-test-subj="tags-editor-combo-box"
      />
    </EuiFormRow>
  );
};

TagsEditorComponent.displayName = 'TagsEditor';

export const TagsEditor = React.memo(TagsEditorComponent);
