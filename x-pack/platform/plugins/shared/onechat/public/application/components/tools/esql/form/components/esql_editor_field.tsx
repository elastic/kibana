/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiText,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { defer, noop } from 'lodash';
import React, { useCallback, useRef } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { promisify } from 'util';
import { useEsqlEditorParams } from '../hooks/use_esql_editor_params';
import { useEsqlParamsValidation } from '../hooks/use_esql_params_validation';
import { i18nMessages } from '../i18n';
import { OnechatEsqlParam, OnechatEsqlToolFormData } from '../types/esql_tool_form_types';
import { EsqlParamRow } from './esql_param_row';

export const OnechatEsqlEditorField = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const { control, getValues, formState, trigger, setFocus } =
    useFormContext<OnechatEsqlToolFormData>();
  const { errors, isSubmitted } = formState;

  const {
    fields: paramFields,
    replace: replaceParamFields,
    append: appendParamField,
    remove: removeParamField,
  } = useFieldArray({
    control,
    name: 'params',
  });

  const params = useWatch({
    control,
    name: 'params',
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEsqlEditorParams({
    params,
    addParam: (name) => appendParamField({ name, description: '', type: ES_FIELD_TYPES.TEXT }),
  });

  const { triggerEsqlParamWarnings, triggerEsqlParamFieldsValidation } = useEsqlParamsValidation();

  const inferParamsFromEsql = useCallback(() => {
    const inferredParamNamesFromEsql = getESQLQueryVariables(getValues('esql'));

    const existingParamsNameMap = getValues('params').reduce((paramNamesMap, param) => {
      if (!paramNamesMap[param.name]) {
        paramNamesMap[param.name] = param;
      }
      return paramNamesMap;
    }, {} as Record<string, OnechatEsqlParam>);

    const updatedParams = [...new Set(inferredParamNamesFromEsql)].map((inferredParamName) => {
      return (
        existingParamsNameMap[inferredParamName] ?? {
          name: inferredParamName,
          description: '',
          type: ES_FIELD_TYPES.TEXT,
        }
      );
    });

    replaceParamFields(updatedParams);

    // Scroll into view
    defer(() => setFocus(`params.${updatedParams.length - 1}.name`));

    triggerEsqlParamWarnings();
  }, [getValues, replaceParamFields, triggerEsqlParamWarnings, setFocus]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup direction="column" gutterSize="xs">
        <Controller
          control={control}
          name="esql"
          render={({ field: { onBlur, ...field } }) => (
            <div
              onBlur={() => {
                if (isSubmitted) {
                  trigger('esql');
                } else {
                  triggerEsqlParamWarnings();
                }
              }}
            >
              <ESQLLangEditor
                query={{ esql: field.value }}
                onTextLangQueryChange={(query) => {
                  field.onChange(query.esql);
                  if (isSubmitted) {
                    triggerEsqlParamWarnings();
                  }
                }}
                onTextLangQuerySubmit={promisify(noop)} // Required prop, but we don't need it
                editorIsInline
                hideRunQueryText
                hasOutline
                hideRunQueryButton
                hideQueryHistory
                hideTimeFilterInfo
                disableAutoFocus
                errors={[]} // Hides the initial error message, won't prevent future errors
              />
            </div>
          )}
        />
        {errors.esql?.message && <EuiFormErrorText>{errors.esql.message}</EuiFormErrorText>}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize={isMobile ? 's' : 'm'}>
        <EuiFlexItem>
          <EuiButton
            iconType="plusInCircle"
            color="primary"
            size="s"
            onClick={() => {
              triggerEsqlParamFieldsValidation(['name', 'description', 'type']);
              appendParamField({ name: '', description: '', type: ES_FIELD_TYPES.TEXT });
            }}
          >
            {i18nMessages.addParamButtonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            iconType="sparkles"
            color="primary"
            size="s"
            onClick={() => {
              inferParamsFromEsql();
              trigger('esql');
              triggerEsqlParamFieldsValidation(['name']);
            }}
          >
            {i18nMessages.inferParamsButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {paramFields.length > 0 ? (
        <div
          ref={tableContainerRef}
          css={css`
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            border-radius: ${euiTheme.border.radius.medium};
            padding: ${euiTheme.size.s};

            .euiTable {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
        >
          <EuiTable compressed>
            <EuiTableHeader>
              <EuiTableHeaderCell width="24px" />
              <EuiTableHeaderCell width="25%">{i18nMessages.paramNameLabel}</EuiTableHeaderCell>
              <EuiTableHeaderCell width="50%">
                {i18nMessages.paramDescriptionLabel}
              </EuiTableHeaderCell>
              <EuiTableHeaderCell width="100px">{i18nMessages.paramTypeLabel}</EuiTableHeaderCell>
              <EuiTableHeaderCell width="36px" />
            </EuiTableHeader>
            <EuiTableBody>
              {paramFields.map((paramField, index) => (
                <EsqlParamRow
                  key={paramField.id}
                  index={index}
                  paramField={paramField}
                  removeParamField={removeParamField}
                />
              ))}
            </EuiTableBody>
          </EuiTable>
        </div>
      ) : (
        <EuiText size="s" color="subdued">
          {i18nMessages.noParamsMessage}
        </EuiText>
      )}
    </EuiFlexGroup>
  );
});
