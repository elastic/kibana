/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { defer } from 'lodash';
import React, { useCallback } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useEsqlEditorParams } from '../../hooks/use_esql_editor_params';
import { useEsqlParamsValidation } from '../../hooks/use_esql_params_validation';
import { i18nMessages } from '../../i18n';
import type { EsqlParamFormData } from '../../types/tool_form_types';
import { EsqlParamSource, type EsqlToolFormData } from '../../types/tool_form_types';
import { EsqlParamRow } from './esql_param_row';

interface EsqlParamActionsProps {
  onAppend: () => void;
  onReplace: (params: EsqlParamFormData[]) => void;
}

const EsqlParamActions: React.FC<EsqlParamActionsProps> = ({ onAppend, onReplace }) => {
  const { trigger, getValues, setFocus } = useFormContext<EsqlToolFormData>();
  const { triggerEsqlParamWarnings, triggerEsqlParamFieldsValidation } = useEsqlParamsValidation();

  const inferParamsFromEsql = useCallback(() => {
    const inferredParamNamesFromEsql = getESQLQueryVariables(getValues('esql'));

    const existingParamsNameMap = getValues('params').reduce((paramNamesMap, param) => {
      if (!paramNamesMap[param.name]) {
        paramNamesMap[param.name] = param;
      }
      return paramNamesMap;
    }, {} as Record<string, EsqlParamFormData>);

    const updatedParams: EsqlParamFormData[] = [...new Set(inferredParamNamesFromEsql)].map(
      (inferredParamName) => {
        return existingParamsNameMap[inferredParamName]
          ? { ...existingParamsNameMap[inferredParamName], source: EsqlParamSource.Inferred }
          : {
              name: inferredParamName,
              description: '',
              type: ES_FIELD_TYPES.TEXT,
              source: EsqlParamSource.Inferred,
              optional: false,
            };
      }
    );

    onReplace(updatedParams);

    // Scroll into view
    defer(() => setFocus(`params.${updatedParams.length - 1}.name`));

    triggerEsqlParamWarnings();
  }, [getValues, onReplace, triggerEsqlParamWarnings, setFocus]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          aria-label={i18nMessages.inferParamsButtonLabel}
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
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          aria-label={i18nMessages.addParamButtonLabel}
          iconType="plusInCircle"
          color="primary"
          size="s"
          onClick={() => {
            triggerEsqlParamFieldsValidation(['name', 'description', 'type']);
            onAppend();
          }}
        >
          {i18nMessages.addParamButtonLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
};

interface EsqlParamsLayoutProps {
  actions: React.ReactNode;
  fields?: React.ReactNode;
}

const EsqlParamsLayout = ({ actions, fields }: EsqlParamsLayoutProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  if (!fields) {
    return (
      <EuiFlexGroup gutterSize={isMobile ? 's' : 'm'} justifyContent="center">
        {actions}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>{fields}</EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
          {actions}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EsqlParams = () => {
  const { euiTheme } = useEuiTheme();
  const { control } = useFormContext<EsqlToolFormData>();

  const {
    fields: paramFields,
    append: appendParamField,
    remove: removeParamField,
    replace: replaceParamFields,
  } = useFieldArray({
    control,
    name: 'params',
  });

  const params = useWatch({
    control,
    name: 'params',
  });

  const handleAppend = useCallback(
    (name?: string) => {
      appendParamField({
        name: name ?? '',
        description: '',
        type: ES_FIELD_TYPES.TEXT,
        source: EsqlParamSource.Custom,
        optional: false,
      });
    },
    [appendParamField]
  );

  const handleReplace = useCallback(
    (nextParams: EsqlParamFormData[]) => {
      replaceParamFields(nextParams);
    },
    [replaceParamFields]
  );

  useEsqlEditorParams({
    params,
    addParam: handleAppend,
  });

  return (
    <EuiPanel hasBorder>
      <EsqlParamsLayout
        actions={<EsqlParamActions onAppend={handleAppend} onReplace={handleReplace} />}
        fields={
          paramFields.length > 0 && (
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
                  <EuiTableHeaderCell width="128px">
                    {i18nMessages.paramTypeLabel}
                  </EuiTableHeaderCell>
                  <EuiTableHeaderCell width="64px" align="center">
                    {i18nMessages.optionalParamLabel}
                  </EuiTableHeaderCell>
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
          )
        }
      />
    </EuiPanel>
  );
};
