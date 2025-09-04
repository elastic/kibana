/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiMarkdownEditor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useToolsTags } from '../../../../hooks/tools/use_tool_tags';
import type { OnechatIndexSearchToolFormData } from './types/index_search_tool_form_types';
import { OnechatIndexPatternField } from './components/index_pattern_field';

export enum OnechatIndexSearchToolFormMode {
  Create = 'create',
  Edit = 'edit',
}

export interface OnechatIndexSearchToolFormProps {
  mode: OnechatIndexSearchToolFormMode;
  formId: string;
  saveTool: (data: OnechatIndexSearchToolFormData) => void;
}

export const OnechatIndexSearchToolForm = ({
  mode,
  formId,
  saveTool,
}: OnechatIndexSearchToolFormProps) => {
  const { euiTheme } = useEuiTheme();
  const { tags, isLoading: isLoadingTags } = useToolsTags();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useFormContext<OnechatIndexSearchToolFormData>();

  return (
    <EuiForm component="form" id={formId} onSubmit={handleSubmit(saveTool)} fullWidth>
      <EuiFormRow
        isDisabled={mode === OnechatIndexSearchToolFormMode.Edit}
        label={i18n.translate('xpack.onechat.tools.newTool.nameLabel', {
          defaultMessage: 'Name',
        })}
        isInvalid={!!errors.name}
        error={errors.name?.message}
      >
        <Controller
          control={control}
          name="name"
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              disabled={mode === OnechatIndexSearchToolFormMode.Edit}
              {...field}
              inputRef={ref}
              isInvalid={invalid}
            />
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.descriptionLabel', {
          defaultMessage: 'Description',
        })}
        isInvalid={!!errors.description}
        error={errors.description?.message}
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <EuiMarkdownEditor
              aria-label={i18n.translate('xpack.onechat.tools.newTool.descriptionAriaLabel', {
                defaultMessage: 'Description',
              })}
              height={200}
              {...field}
            />
          )}
        />
      </EuiFormRow>
      <OnechatIndexPatternField />
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.tagsLabel', {
          defaultMessage: 'Tags',
        })}
        isInvalid={!!errors.tags}
        error={errors.tags?.message as string}
      >
        <Controller
          control={control}
          name="tags"
          render={({ field: { value, onChange, ref, ...field }, fieldState: { invalid } }) => (
            <EuiComboBox
              placeholder={i18n.translate('xpack.onechat.tools.newTool.tagsPlaceholder', {
                defaultMessage: 'Add or create tags',
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
              css={css`
                .euiBadge {
                  background-color: ${euiTheme.colors.backgroundBasePrimary};
                  color: ${euiTheme.colors.textPrimary};
                }
              `}
              fullWidth
              inputRef={ref}
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
