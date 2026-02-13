/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { useUniqueTags } from '../../actions/use_unique_tags';

const TagsFieldComponent: React.FC = () => {
  const {
    field: { value = [], onChange },
  } = useController({ name: 'tags', defaultValue: [] });

  const { data: existingTags } = useUniqueTags();

  const currentTags = value as string[];

  const options: EuiComboBoxOptionOption[] = useMemo(
    () =>
      (existingTags ?? [])
        .filter((tag) => !currentTags.includes(tag))
        .map((tag) => ({ label: tag })),
    [existingTags, currentTags]
  );

  const selectedOptions: EuiComboBoxOptionOption[] = useMemo(
    () => currentTags.map((tag: string) => ({ label: tag })),
    [currentTags]
  );

  const handleChange = useCallback(
    (opts: EuiComboBoxOptionOption[]) => {
      onChange(opts.map((o) => o.label));
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (!trimmed || trimmed.length > 256 || currentTags.length >= 20) return;
      if (currentTags.includes(trimmed)) return;
      onChange([...currentTags, trimmed]);
    },
    [currentTags, onChange]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.liveQueryForm.tags.label', {
        defaultMessage: 'Tags',
      })}
      helpText={i18n.translate('xpack.osquery.liveQueryForm.tags.helpText', {
        defaultMessage: 'Optional. Type and press Enter to create tags.',
      })}
      fullWidth
    >
      <EuiComboBox
        placeholder={i18n.translate('xpack.osquery.liveQueryForm.tags.placeholder', {
          defaultMessage: 'Add tags...',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        isClearable
        fullWidth
      />
    </EuiFormRow>
  );
};

export const TagsField = React.memo(TagsFieldComponent);
TagsField.displayName = 'TagsField';
