/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUpdateTags } from './use_update_tags';
import { useUniqueTags } from './use_unique_tags';

interface TagsEditorProps {
  actionId: string;
  tags: string[];
  isReadOnly?: boolean;
}

const TagsEditorComponent: React.FC<TagsEditorProps> = ({ actionId, tags, isReadOnly = false }) => {
  const [localTags, setLocalTags] = useState<string[]>(tags);
  const updateTagsMutation = useUpdateTags();
  const { data: existingTags } = useUniqueTags(!isReadOnly);

  const options: EuiComboBoxOptionOption[] = useMemo(
    () =>
      (existingTags ?? [])
        .filter((tag) => !localTags.includes(tag))
        .map((tag) => ({ label: tag })),
    [existingTags, localTags]
  );

  const selectedOptions: EuiComboBoxOptionOption[] = useMemo(
    () => localTags.map((tag) => ({ label: tag })),
    [localTags]
  );

  const persistTags = useCallback(
    (newTags: string[]) => {
      setLocalTags(newTags);
      updateTagsMutation.mutate({ actionId, tags: newTags });
    },
    [actionId, updateTagsMutation]
  );

  const handleChange = useCallback(
    (opts: EuiComboBoxOptionOption[]) => {
      persistTags(opts.map((o) => o.label));
    },
    [persistTags]
  );

  const handleCreateOption = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length > 256 || localTags.length >= 20) return;
      if (localTags.includes(trimmed)) return;
      persistTags([...localTags, trimmed]);
    },
    [localTags, persistTags]
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.osquery.tags.label', { defaultMessage: 'Tags' })}
          fullWidth
        >
          <EuiComboBox
            placeholder={i18n.translate('xpack.osquery.tags.placeholder', {
              defaultMessage: 'Add tags...',
            })}
            options={options}
            selectedOptions={selectedOptions}
            onChange={handleChange}
            onCreateOption={handleCreateOption}
            isClearable
            isDisabled={isReadOnly}
            isLoading={updateTagsMutation.isLoading}
            fullWidth
            compressed
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TagsEditor = React.memo(TagsEditorComponent);
TagsEditor.displayName = 'TagsEditor';
