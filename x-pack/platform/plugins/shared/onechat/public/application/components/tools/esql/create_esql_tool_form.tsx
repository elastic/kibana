/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHideFor,
  EuiHorizontalRule,
  EuiMarkdownEditor,
  EuiSelect,
  EuiShowFor,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ESQLLangEditor } from '@kbn/esql/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { capitalize, noop } from 'lodash';
import React, { useCallback } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { promisify } from 'util';
import { OnechatCreateEsqlToolFormData, OnechatEsqlParam } from '../../../../types';
import { useEsqlEditorParams } from '../../../hooks/use_esql_editor_params';
import { useOnechatToolsTags } from '../../../hooks/use_tools';

const PARAM_TYPE_OPTIONS = [
  ES_FIELD_TYPES.TEXT,
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.BOOLEAN,
  ES_FIELD_TYPES.DATE,
  ES_FIELD_TYPES.OBJECT,
  ES_FIELD_TYPES.NESTED,
];

export interface OnechatEsqlToolFormProps {
  formId: string;
  onSave: (data: OnechatCreateEsqlToolFormData) => void;
}

export const OnechatEsqlToolForm = ({ formId, onSave }: OnechatEsqlToolFormProps) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { tags, isLoading: isLoadingTags } = useOnechatToolsTags();

  const { control, handleSubmit } = useFormContext<OnechatCreateEsqlToolFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'params' });
  const params: OnechatEsqlParam[] = useWatch({ control, name: 'params' });

  const addParam = useCallback(
    (name = '') => {
      append({
        name,
        type: ES_FIELD_TYPES.TEXT,
        description: '',
      });
    },
    [append]
  );

  useEsqlEditorParams(params, addParam);

  return (
    <EuiForm component="form" id={formId} onSubmit={handleSubmit(onSave)} fullWidth>
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.nameLabel', {
          defaultMessage: 'Name',
        })}
      >
        <Controller
          control={control}
          name="name"
          render={({ field: { ref, ...field } }) => <EuiFieldText {...field} inputRef={ref} />}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.descriptionLabel', {
          defaultMessage: 'Description',
        })}
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
      >
        <Controller
          control={control}
          name="esql"
          render={({ field }) => (
            <ESQLLangEditor
              query={{ esql: field.value }}
              onTextLangQueryChange={(query) => field.onChange(query.esql)}
              onTextLangQuerySubmit={promisify(noop)}
              editorIsInline
              hideRunQueryText
              hasOutline
              hideRunQueryButton
              hideQueryHistory
              hideTimeFilterInfo
              disableAutoFocus
            />
          )}
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiHorizontalRule margin="none" />
          {fields.length > 0 && (
            <EuiFlexGroup direction="column" gutterSize={isMobile ? 's' : 'xs'}>
              {fields.map((paramField, index) => (
                <EuiFlexGroup
                  key={paramField.id}
                  gutterSize="s"
                  css={css`
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                    border-radius: ${euiTheme.border.radius.medium};
                    padding: ${euiTheme.size.s};
                  `}
                  alignItems="center"
                >
                  <EuiFlexItem>
                    <Controller
                      control={control}
                      name={`params.${index}.name`}
                      render={({ field: { ref, ...field } }) => (
                        <EuiFieldText
                          compressed
                          placeholder="Parameter"
                          inputRef={ref}
                          {...field}
                        />
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <Controller
                      control={control}
                      name={`params.${index}.description`}
                      render={({ field: { ref, ...field } }) => (
                        <EuiFieldText
                          compressed
                          placeholder="Description"
                          inputRef={ref}
                          {...field}
                        />
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <Controller
                      control={control}
                      name={`params.${index}.type`}
                      render={({ field: { ref, ...field } }) => (
                        <EuiSelect
                          compressed
                          options={PARAM_TYPE_OPTIONS.map((type) => ({
                            value: type,
                            text: capitalize(type),
                          }))}
                          inputRef={ref}
                          {...field}
                        />
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHideFor sizes={['xs', 's']}>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        onClick={() => remove(index)}
                        aria-label={i18n.translate(
                          'xpack.onechat.tools.newTool.removeParamAriaLabel',
                          {
                            defaultMessage: 'Remove parameter',
                          }
                        )}
                      />
                    </EuiHideFor>
                    <EuiShowFor sizes={['xs', 's']}>
                      <EuiButton
                        fullWidth
                        color="danger"
                        iconType="trash"
                        onClick={() => remove(index)}
                        size="s"
                      >
                        {i18n.translate('xpack.onechat.tools.newTool.removeParamButtonLabel', {
                          defaultMessage: 'Remove parameter',
                        })}
                      </EuiButton>
                    </EuiShowFor>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ))}
            </EuiFlexGroup>
          )}
          <EuiButton
            size="s"
            iconType="plusInCircle"
            onClick={() => addParam()}
            fullWidth={isMobile}
            css={css`
              align-self: flex-start;
            `}
          >
            {i18n.translate('xpack.onechat.tools.newTool.addParamButtonLabel', {
              defaultMessage: 'Add parameter',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.tagsLabel', {
          defaultMessage: 'Tags',
        })}
      >
        <Controller
          control={control}
          name="tags"
          render={({ field: { value, onChange, ref, ...field } }) => (
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
