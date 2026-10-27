/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  MAX_LENGTH_PER_WORKFLOW_TAG,
  MAX_WORKFLOW_TAGS_PER_CONFIGURATION,
} from '../../../common/constants';
import { useGetWorkflowTags } from '../../containers/configure/use_get_workflow_tags';
import * as i18n from './translations';

interface WorkflowTagsProps {
  isLoading: boolean;
  disabled: boolean;
  /** Current configured tags. */
  workflowTags: string[];
  onChange: (tags: string[]) => void;
}

const toOption = (tag: string): EuiComboBoxOptionOption<string> => ({ label: tag });

// Workflows don't bound tag length, but the configuration API does, so longer tags can't be saved.
const isTagWithinMaxLength = (tag: string): boolean => tag.length <= MAX_LENGTH_PER_WORKFLOW_TAG;

/**
 * Settings-page combo box for configuring which workflow tags are visible in
 * Cases workflow selectors. Fetches existing tag suggestions from the workflow
 * aggregation API and also allows admins to enter a tag that no workflow yet has.
 */
export const WorkflowTags: React.FC<WorkflowTagsProps> = ({
  isLoading,
  disabled,
  workflowTags,
  onChange,
}) => {
  // Only fetch when the component is enabled (workflows feature is available).
  const { data: availableTags = [], isLoading: isLoadingTags } = useGetWorkflowTags({
    enabled: !disabled,
  });

  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => availableTags.filter(isTagWithinMaxLength).map(toOption),
    [availableTags]
  );
  const selectedOptions = useMemo(() => workflowTags.map(toOption), [workflowTags]);

  const handleChange = useCallback(
    (newOptions: EuiComboBoxOptionOption<string>[]) => {
      onChange(newOptions.map(({ label }) => label));
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const trimmed = searchValue.trim();
      if (!trimmed) return false;
      if (!isTagWithinMaxLength(trimmed)) {
        setError(i18n.WORKFLOW_TAG_TOO_LONG(MAX_LENGTH_PER_WORKFLOW_TAG));
        return false;
      }
      if (workflowTags.includes(trimmed)) return false;
      if (workflowTags.length >= MAX_WORKFLOW_TAGS_PER_CONFIGURATION) return false;
      onChange([...workflowTags, trimmed]);
      return true;
    },
    [onChange, workflowTags]
  );

  const handleSearchChange = useCallback(() => setError(null), []);

  return (
    <EuiFormRow
      fullWidth
      label={i18n.WORKFLOW_TAGS_LABEL}
      error={error ?? undefined}
      isInvalid={error != null}
    >
      <EuiComboBox
        fullWidth
        isInvalid={error != null}
        aria-label={i18n.WORKFLOW_TAGS_LABEL}
        data-test-subj="cases-workflow-tags"
        isLoading={isLoading || isLoadingTags}
        isDisabled={disabled}
        isCaseSensitive
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        onSearchChange={handleSearchChange}
        customOptionText={i18n.ADD_WORKFLOW_TAG_COMBO_BOX}
      />
    </EuiFormRow>
  );
};

WorkflowTags.displayName = 'WorkflowTags';
