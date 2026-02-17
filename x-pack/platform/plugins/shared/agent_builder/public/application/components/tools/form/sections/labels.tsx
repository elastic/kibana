/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow, EuiText } from '@elastic/eui';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useToolsTags } from '../../../../hooks/tools/use_tool_tags';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import { ToolFormMode } from '../tool_form';
import type { ToolFormData } from '../types/tool_form_types';

export interface LabelsProps {
  mode: ToolFormMode;
}

export const LabelsSection = ({ mode }: LabelsProps) => {
  const { tags, isLoading: isLoadingTags } = useToolsTags();
  const {
    control,
    formState: { errors },
  } = useFormContext<ToolFormData>();

  const isReadOnly = mode === ToolFormMode.View;

  return (
    <ToolFormSection
      title={i18nMessages.toolLabels.documentation.title}
      icon="tag"
      description={i18nMessages.toolLabels.documentation.description}
    >
      <EuiFormRow
        label={i18nMessages.toolLabels.form.label}
        labelAppend={
          !isReadOnly ? (
            <EuiText size="xs" color="subdued">
              {i18nMessages.optionalFieldLabel}
            </EuiText>
          ) : undefined
        }
        isInvalid={!!errors.labels}
        error={errors.labels?.message}
      >
        <Controller
          control={control}
          name="labels"
          render={({ field: { value, onChange, ref, ...field }, fieldState: { invalid } }) => (
            <EuiComboBox
              placeholder={!isReadOnly ? i18nMessages.toolLabels.form.placeholder : undefined}
              options={tags.map((tag: string) => ({ label: tag }))}
              selectedOptions={value.map((tag: string) => ({ label: tag }))}
              onChange={(selectedOptions) => {
                onChange(selectedOptions.map((option) => option.label));
              }}
              onCreateOption={(newTag) => {
                onChange([...value, newTag]);
              }}
              isClearable={true}
              isLoading={isLoadingTags}
              isInvalid={invalid}
              fullWidth
              isDisabled={isReadOnly}
              inputRef={ref}
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </ToolFormSection>
  );
};
