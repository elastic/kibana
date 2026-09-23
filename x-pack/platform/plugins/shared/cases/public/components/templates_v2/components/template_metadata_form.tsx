/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiForm, EuiFormRow, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useGetTemplateTags } from '../hooks/use_get_template_tags';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
import { DebouncedTemplateTextField } from './debounced_template_text_field';
import * as i18n from '../translations';

interface TemplateMetadataFormProps {
  metadata: TemplateMetadata;
  errors: TemplateMetadataErrors;
  onChange: (metadata: TemplateMetadata) => void;
  compact?: boolean;
}

export const TemplateMetadataForm: React.FC<TemplateMetadataFormProps> = ({
  metadata,
  errors,
  onChange,
  compact = false,
}) => {
  const { data: knownTags = [] } = useGetTemplateTags();

  const availableTagOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => knownTags.map((tag) => ({ label: tag, value: tag })),
    [knownTags]
  );

  const selectedTagOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => metadata.tags.map((tag) => ({ label: tag, value: tag })),
    [metadata.tags]
  );

  const handleDescriptionChange = useCallback(
    (value: string) => onChange({ ...metadata, description: value }),
    [metadata, onChange]
  );

  const handleTagsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      onChange({ ...metadata, tags: options.map((option) => option.label) });
    },
    [metadata, onChange]
  );

  const handleCreateTag = useCallback(
    (searchValue: string) => {
      const trimmed = searchValue.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (metadata.tags.some((tag) => tag === trimmed)) {
        return;
      }

      onChange({ ...metadata, tags: [...metadata.tags, trimmed] });
    },
    [metadata, onChange]
  );

  const showSectionHeader = !compact;
  const optionalMetadataRows = (
    <>
      <DebouncedTemplateTextField
        multiline
        label={i18n.TEMPLATE_DESCRIPTION_LABEL}
        value={metadata.description}
        onChange={handleDescriptionChange}
        isInvalid={errors.description != null}
        error={errors.description}
        dataTestSubj="templateMetadataDescriptionInput"
      />

      <EuiFormRow
        label={i18n.TEMPLATE_TAGS_LABEL}
        helpText={i18n.TEMPLATE_TAGS_HELP_TEXT}
        isInvalid={errors.tags != null}
        error={errors.tags}
        fullWidth
      >
        <EuiComboBox
          fullWidth
          options={availableTagOptions}
          selectedOptions={selectedTagOptions}
          onChange={handleTagsChange}
          onCreateOption={handleCreateTag}
          isInvalid={errors.tags != null}
          data-test-subj="templateMetadataTagsInput"
        />
      </EuiFormRow>
    </>
  );

  return (
    <EuiForm component="div" data-test-subj="templateMetadataForm">
      {showSectionHeader && (
        <>
          <EuiTitle size="xxs">
            <h4>{i18n.TEMPLATE_METADATA_SECTION_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {i18n.TEMPLATE_METADATA_SECTION_DESCRIPTION}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {/* The template name is edited in the page title, not here — see TemplateFormLayout. */}
      {optionalMetadataRows}
    </EuiForm>
  );
};

TemplateMetadataForm.displayName = 'TemplateMetadataForm';
