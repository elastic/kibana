/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiComboBox, EuiFormRow, EuiSelect, type EuiComboBoxOptionOption } from '@elastic/eui';
import { DatasetTags, MAX_TAGS_PER_DATASET, type DatasetMaturity } from '@kbn/evals-common';
import { MATURITY_LEVELS, getMaturityLabel } from './maturity';
import * as i18n from './translations';

/**
 * Lowercases to match what the server stores, and trims because the API rejects
 * surrounding whitespace rather than cleaning it up.
 */
const normalizeTag = (value: string) => value.trim().toLowerCase();

const isValidTag = (tag: string) => DatasetTags.safeParse([tag]).success;

interface DatasetTagsFieldsProps {
  tags: string[];
  maturity: DatasetMaturity | null;
  onTagsChange: (tags: string[]) => void;
  onMaturityChange: (maturity: DatasetMaturity | null) => void;
  /** Tags already used by other datasets, offered as suggestions. */
  suggestedTags?: string[];
}

export const DatasetTagsFields: React.FC<DatasetTagsFieldsProps> = ({
  tags,
  maturity,
  onTagsChange,
  onMaturityChange,
  suggestedTags = [],
}) => {
  const [tagError, setTagError] = useState<string | null>(null);

  const onCreateTag = (searchValue: string) => {
    const tag = normalizeTag(searchValue);

    if (!tag) {
      return false;
    }
    if (!isValidTag(tag)) {
      setTagError(i18n.getInvalidTagError(searchValue.trim()));
      return false;
    }
    if (tags.includes(tag)) {
      setTagError(null);
      return;
    }
    if (tags.length >= MAX_TAGS_PER_DATASET) {
      setTagError(i18n.getTooManyTagsError(MAX_TAGS_PER_DATASET));
      return false;
    }

    setTagError(null);
    onTagsChange([...tags, tag]);
  };

  const onSelectedTagsChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    if (selected.length > MAX_TAGS_PER_DATASET) {
      setTagError(i18n.getTooManyTagsError(MAX_TAGS_PER_DATASET));
      return;
    }

    setTagError(null);
    onTagsChange(selected.map(({ label }) => label));
  };

  return (
    <>
      <EuiFormRow
        label={i18n.TAGS_LABEL}
        helpText={i18n.TAGS_HELP_TEXT}
        isInvalid={Boolean(tagError)}
        error={tagError ?? undefined}
        fullWidth
      >
        <EuiComboBox<string>
          placeholder={i18n.TAGS_PLACEHOLDER}
          options={suggestedTags.map((tag) => ({ label: tag }))}
          selectedOptions={tags.map((tag) => ({ label: tag }))}
          onChange={onSelectedTagsChange}
          onCreateOption={onCreateTag}
          customOptionText={i18n.ADD_TAG_CUSTOM_OPTION}
          isInvalid={Boolean(tagError)}
          isClearable
          fullWidth
          data-test-subj="datasetTagsComboBox"
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.MATURITY_LABEL} helpText={i18n.MATURITY_HELP_TEXT} fullWidth>
        <EuiSelect
          options={[
            { value: '', text: i18n.MATURITY_NONE_OPTION },
            ...MATURITY_LEVELS.map((level) => ({ value: level, text: getMaturityLabel(level) })),
          ]}
          value={maturity ?? ''}
          onChange={(event) =>
            onMaturityChange(event.target.value ? (event.target.value as DatasetMaturity) : null)
          }
          fullWidth
          data-test-subj="datasetMaturitySelect"
        />
      </EuiFormRow>
    </>
  );
};
