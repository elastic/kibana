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
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { defer } from 'lodash';
import React, { useCallback } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useEsqlParamsValidation } from '../hooks/use_esql_params_validation';
import { i18nMessages } from '../i18n';
import type { EsqlParam, EsqlToolFormData } from '../types/tool_form_types';
import { EsqlParamRow } from './esql_param_row';
import { useEsqlEditorParams } from '../hooks/use_esql_editor_params';
export const EsqlParams = () => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const { control, trigger, getValues, setFocus } = useFormContext<EsqlToolFormData>();

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
    }, {} as Record<string, EsqlParam>);

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
    <>
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
    </>
  );
};
