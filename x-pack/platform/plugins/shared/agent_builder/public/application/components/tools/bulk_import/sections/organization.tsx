/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { useToolsTags } from '../../../../hooks/tools/use_tool_tags';
import { labels } from '../../../../utils/i18n';
import { ToolFormSection } from '../../form/components/tool_form_section';
import type { BulkImportMcpToolsFormData } from '../types';

export const OrganizationSection = () => {
  const { control, formState } = useFormContext<BulkImportMcpToolsFormData>();
  const { errors } = formState;

  const { tags, isLoading: isLoadingTags } = useToolsTags();
  const labelsOptions = useMemo(() => tags.map((tag: string) => ({ label: tag })), [tags]);

  return (
    <ToolFormSection
      title={labels.tools.bulkImportMcp.organizationSection.title}
      icon="tag"
      description={labels.tools.bulkImportMcp.organizationSection.description}
    >
      <EuiFormRow
        label={labels.tools.bulkImportMcp.organizationSection.namespaceLabel}
        helpText={labels.tools.bulkImportMcp.organizationSection.namespaceHelpText}
        isInvalid={!!errors.namespace}
        error={errors.namespace?.message}
      >
        <Controller
          control={control}
          name="namespace"
          render={({ field: { ref, ...field } }) => (
            <EuiFieldText
              isInvalid={!!errors.namespace}
              fullWidth
              data-test-subj="bulkImportMcpToolsNamespaceInput"
              {...field}
              inputRef={ref}
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        label={labels.tools.bulkImportMcp.organizationSection.labelsLabel}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {labels.common.optional}
          </EuiText>
        }
      >
        <Controller
          control={control}
          name="labels"
          render={({ field: { value, onChange, ref, ...field }, fieldState: { invalid } }) => (
            <EuiComboBox
              options={labelsOptions}
              selectedOptions={value.map((label: string) => ({ label }))}
              onChange={(selectedOptions) => {
                onChange(selectedOptions.map((option) => option.label));
              }}
              onCreateOption={(newTag) => {
                onChange([...value, newTag]);
              }}
              isClearable
              isLoading={isLoadingTags}
              isInvalid={invalid}
              fullWidth
              inputRef={ref}
              data-test-subj="bulkImportMcpToolsLabelsSelect"
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </ToolFormSection>
  );
};
