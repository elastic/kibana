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
import { useOnechatToolsTags } from '../../../../hooks/use_tools';
import { OnechatEsqlEditorField } from './components/esql_editor_field';
import { OnechatEsqlToolFormData } from './types/esql_tool_form_types';

export interface OnechatEsqlToolFormProps {
  formId: string;
  saveTool: (data: OnechatEsqlToolFormData) => void;
}

export const OnechatEsqlToolForm = ({ formId, saveTool }: OnechatEsqlToolFormProps) => {
  const { euiTheme } = useEuiTheme();
  const { tags, isLoading: isLoadingTags } = useOnechatToolsTags();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useFormContext<OnechatEsqlToolFormData>();

  return (
    <EuiForm component="form" id={formId} onSubmit={handleSubmit(saveTool)} fullWidth>
      <EuiFormRow
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
            <EuiFieldText {...field} inputRef={ref} isInvalid={invalid} />
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
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.esqlLabel', {
          defaultMessage: 'ES|QL',
        })}
        isInvalid={!!errors.esql}
      >
        <OnechatEsqlEditorField />
      </EuiFormRow>
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
