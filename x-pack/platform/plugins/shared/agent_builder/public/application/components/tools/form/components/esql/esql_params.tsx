/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
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
import { EsqlToolFieldType } from '@kbn/agent-builder-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { defer } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useEsqlEditorParams } from '../../hooks/use_esql_editor_params';
import { useEsqlParamsValidation } from '../../hooks/use_esql_params_validation';
import { i18nMessages } from '../../i18n';
import type { EsqlParamFormData } from '../../types/tool_form_types';
import { EsqlParamSource, type EsqlToolFormData } from '../../types/tool_form_types';
import { ESQL_DEFAULT_PARAMS } from '../../registry/tool_types/esql';
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
              type: EsqlToolFieldType.STRING,
              source: EsqlParamSource.Inferred,
              optional: false,
              defaultValue: undefined,
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
  const { control } = useFormContext<
    // params is undefined for one render loop after type changes
    Omit<EsqlToolFormData, 'params'> & { params?: EsqlParamFormData[] }
  >();
  const {
    services: { docLinks },
  } = useKibana();

  const {
    fields: paramFields,
    append: appendParamField,
    remove: removeParamField,
    replace: replaceParamFields,
  } = useFieldArray({
    control,
    name: 'params',
  });

  const params =
    useWatch({
      control,
      name: 'params',
    }) ?? ESQL_DEFAULT_PARAMS;

  const hasArrayType = useMemo(() => {
    return params.some((param) => param.type === EsqlToolFieldType.ARRAY);
  }, [params]);

  const handleAppend = useCallback(
    (name?: string) => {
      appendParamField({
        name: name ?? '',
        description: '',
        type: EsqlToolFieldType.STRING,
        source: EsqlParamSource.Custom,
        optional: false,
        defaultValue: undefined,
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
            <>
              {hasArrayType && (
                // Warn user that they need to use MV_CONTAINS because ES|QL doesn't support array for "IN (IN)" operator
                <>
                  <EuiCallOut
                    announceOnMount
                    size="s"
                    color="primary"
                    iconType="info"
                    css={css`
                      .euiText {
                        color: ${euiTheme.colors.textPrimary} !important;
                      }
                    `}
                  >
                    <EuiText size="s">
                      <FormattedMessage
                        id="xpack.agentBuilder.tools.newTool.configuration.form.esql.arrayTypeNotification"
                        defaultMessage="You must use {mvContainsLink} in your ES|QL query to filter by array type parameters."
                        values={{
                          mvContainsLink: (
                            <EuiLink
                              href={docLinks.links.query.queryESQLMultiValueControls}
                              target="_blank"
                              data-test-subj="mvContainsLink"
                              aria-label="MV_CONTAINS"
                            >
                              MV_CONTAINS
                            </EuiLink>
                          ),
                        }}
                      />
                    </EuiText>
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}
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
                    <EuiTableHeaderCell width="20%">
                      {i18nMessages.paramNameLabel}
                    </EuiTableHeaderCell>
                    <EuiTableHeaderCell width="40%">
                      {i18nMessages.paramDescriptionLabel}
                    </EuiTableHeaderCell>
                    <EuiTableHeaderCell width="128px">
                      {i18nMessages.paramTypeLabel}
                    </EuiTableHeaderCell>
                    <EuiTableHeaderCell width="64px" align="center">
                      {i18nMessages.optionalParamLabel}
                    </EuiTableHeaderCell>
                    <EuiTableHeaderCell width="15%">
                      {i18nMessages.defaultValueLabel}
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
            </>
          )
        }
      />
    </EuiPanel>
  );
};
