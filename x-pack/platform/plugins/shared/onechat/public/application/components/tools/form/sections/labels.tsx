/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useToolsTags } from '../../../../hooks/tools/use_tool_tags';
import { ToolFormSection } from '../components/tool_form_section';
import type { EsqlToolFormData } from '../types/tool_form_types';

export const Labels = () => {
  const { tags, isLoading: isLoadingTags } = useToolsTags();
  const {
    control,
    formState: { errors },
  } = useFormContext<EsqlToolFormData>();
  return (
    <ToolFormSection
      title="Labels"
      icon="tag"
      description="Labels help with filtering, search, and bulk selection — they don't affect how tools behave."
      documentation={{
        title: 'Tool labels',
        href: 'https://www.elastic.co/guide/en/enterprise-search/current/tool-labels.html',
      }}
    >
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.tagsLabel', {
          defaultMessage: 'Labels',
        })}
        labelAppend={
          <EuiText size="xs" color="subdued">
            Optional
          </EuiText>
        }
        isInvalid={!!errors.labels}
        helpText={'Some labels may automatically be added by Elastic.'}
        error={errors.labels?.message as string}
      >
        <Controller
          control={control}
          name="labels"
          render={({ field: { value, onChange, ref, ...field }, fieldState: { invalid } }) => (
            <EuiComboBox
              placeholder={i18n.translate('xpack.onechat.tools.newTool.tagsPlaceholder', {
                defaultMessage: 'Add or create labels',
              })}
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
