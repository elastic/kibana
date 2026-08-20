/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { MAX_LENGTH_PER_TAG, MAX_WORKFLOW_TAGS_PER_CONFIGURATION } from '../../../common/constants';
import * as i18n from './translations';

interface WorkflowTagsProps {
  disabled: boolean;
  workflowTags: string[];
  onChange: (workflowTags: string[]) => void;
}

export const WorkflowTags: React.FC<WorkflowTagsProps> = React.memo(
  ({ disabled, workflowTags, onChange }) => {
    const [searchValue, setSearchValue] = useState('');
    const selectedOptions = useMemo(() => workflowTags.map((label) => ({ label })), [workflowTags]);
    const isSearchInvalid = searchValue.trim().length > MAX_LENGTH_PER_TAG;

    const onTagsChange = useCallback(
      (options: Array<EuiComboBoxOptionOption<string>>) => {
        onChange(options.map(({ label }) => label));
      },
      [onChange]
    );

    const onCreateOption = useCallback(
      (value: string) => {
        const tag = value.trim();
        if (
          !tag ||
          tag.length > MAX_LENGTH_PER_TAG ||
          workflowTags.includes(tag) ||
          workflowTags.length >= MAX_WORKFLOW_TAGS_PER_CONFIGURATION
        ) {
          return;
        }

        onChange([...workflowTags, tag]);
        setSearchValue('');
      },
      [onChange, workflowTags]
    );

    return (
      <EuiFormRow
        fullWidth
        label={i18n.WORKFLOW_TAGS_LABEL}
        isInvalid={isSearchInvalid}
        error={isSearchInvalid ? i18n.WORKFLOW_TAG_TOO_LONG : undefined}
      >
        <EuiComboBox
          fullWidth
          aria-label={i18n.WORKFLOW_TAGS_LABEL}
          data-test-subj="cases-workflow-tags"
          isCaseSensitive
          isDisabled={disabled}
          isInvalid={isSearchInvalid}
          noSuggestions
          options={selectedOptions}
          selectedOptions={selectedOptions}
          onChange={onTagsChange}
          onCreateOption={onCreateOption}
          onSearchChange={setSearchValue}
          customOptionText={i18n.ADD_WORKFLOW_TAG_COMBO_BOX}
        />
      </EuiFormRow>
    );
  }
);

WorkflowTags.displayName = 'WorkflowTags';
