/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useState } from 'react';
import { useFetchTags } from '../../../../hooks/use_fetch_tags';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export const TagsInput = ({ value, onChange }: TagsInputProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 200);

  const { data: existingTags, isLoading } = useFetchTags({
    search: debouncedQuery,
  });

  const tagOptions = (existingTags ?? []).map((tag) => ({ label: tag }));

  return (
    <EuiComboBox
      aria-label={i18n.translate('xpack.alertingV2.actionPolicy.form.tags.ariaLabel', {
        defaultMessage: 'Tags',
      })}
      fullWidth
      async
      isLoading={isLoading}
      data-test-subj="tagsInput"
      placeholder={i18n.translate('xpack.alertingV2.actionPolicy.form.tags.placeholder', {
        defaultMessage: 'Add tags to organize and filter policies',
      })}
      selectedOptions={value.map((t) => ({ label: t }))}
      options={tagOptions}
      onSearchChange={setSearchQuery}
      onCreateOption={(val) => {
        if (val.trim().length > 0 && !value.includes(val.trim())) {
          onChange([...value, val.trim()]);
        }
      }}
      onChange={(options) => {
        onChange(options.map((o) => o.label));
      }}
    />
  );
};
