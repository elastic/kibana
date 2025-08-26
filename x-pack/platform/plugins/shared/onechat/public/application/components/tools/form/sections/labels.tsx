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
import type { EsqlToolFormData } from '../types/tool_form_types';

export const Labels = () => {
  const { tags, isLoading: isLoadingTags } = useToolsTags();
  const {
    control,
    formState: { errors },
  } = useFormContext<EsqlToolFormData>();
  return (
    <ToolFormSection
      title={i18nMessages.toolLabels.documentation.title}
      icon="tag"
      description={i18nMessages.toolLabels.documentation.description}
      documentation={{
        title: i18nMessages.toolLabels.documentation.documentationLink,
        href: 'https://www.elastic.co/guide/en/enterprise-search/current/tool-labels.html',
      }}
    >
      <EuiFormRow
        label={i18nMessages.toolLabels.form.label}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {i18nMessages.optionalFieldLabel}
          </EuiText>
        }
        isInvalid={!!errors.labels}
        helpText={i18nMessages.toolLabels.form.helpText}
        error={errors.labels?.message as string}
      >
        <Controller
          control={control}
          name="labels"
          render={({ field: { value, onChange, ref, ...field }, fieldState: { invalid } }) => (
            <EuiComboBox
              placeholder={i18nMessages.toolLabels.form.placeholder}
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
              inputRef={ref}
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </ToolFormSection>
  );
};
