/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox } from '@elastic/eui';

interface TagsFieldProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  'aria-label': string;
  'data-test-subj': string;
}

/** Free-form tags: type and press Enter to add one. */
export const TagsField = ({
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}: TagsFieldProps) => (
  <EuiComboBox<string>
    fullWidth
    noSuggestions
    placeholder={placeholder}
    aria-label={ariaLabel}
    selectedOptions={value.map((tag) => ({ label: tag }))}
    onCreateOption={(searchValue) => {
      const tag = searchValue.trim();
      if (tag !== '' && !value.includes(tag)) {
        onChange([...value, tag]);
      }
    }}
    onChange={(options) => onChange(options.map((option) => option.label))}
    data-test-subj={dataTestSubj}
  />
);
