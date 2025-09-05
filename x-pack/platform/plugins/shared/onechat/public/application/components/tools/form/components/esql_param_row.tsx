/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiSuperSelect,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiToken,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EsqlToolFieldType } from '@kbn/onechat-common';
import React, { useCallback, useMemo } from 'react';
import type { FieldArrayWithId, FieldError } from 'react-hook-form';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useEsqlParamsValidation } from '../hooks/use_esql_params_validation';
import { i18nMessages } from '../i18n';
import { EsqlParamSource, type EsqlToolFormData } from '../types/tool_form_types';

const FIELD_TYPE_TOKEN_MAP: Record<EsqlToolFieldType, string> = {
  [EsqlToolFieldType.TEXT]: 'tokenString',
  [EsqlToolFieldType.KEYWORD]: 'tokenKeyword',
  [EsqlToolFieldType.LONG]: 'tokenNumber',
  [EsqlToolFieldType.INTEGER]: 'tokenNumber',
  [EsqlToolFieldType.DOUBLE]: 'tokenNumber',
  [EsqlToolFieldType.FLOAT]: 'tokenNumber',
  [EsqlToolFieldType.BOOLEAN]: 'tokenBoolean',
  [EsqlToolFieldType.DATE]: 'tokenDate',
  [EsqlToolFieldType.OBJECT]: 'tokenObject',
  [EsqlToolFieldType.NESTED]: 'tokenNested',
};

interface EsqlParamRowProps {
  index: number;
  paramField: FieldArrayWithId<EsqlToolFormData, 'params', 'id'>;
  removeParamField: (index: number) => void;
}

export const EsqlParamRow: React.FC<EsqlParamRowProps> = ({
  index,
  paramField,
  removeParamField,
}) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { control, formState, setValue } = useFormContext<EsqlToolFormData>();
  const { errors, isSubmitted } = formState;

  const { triggerEsqlParamWarnings, triggerEsqlParamFieldsValidation } = useEsqlParamsValidation();

  const handleValidation = useCallback(() => {
    triggerEsqlParamFieldsValidation(['name']);
    triggerEsqlParamWarnings();
  }, [triggerEsqlParamFieldsValidation, triggerEsqlParamWarnings]);

  const [warning, source] = useWatch({
    control,
    name: [`params.${index}.warning`, `params.${index}.source`],
  });

  const paramErrors = errors.params?.[index];
  const errorMessages = useMemo(() => {
    // Mobile will display field level validation errors
    if (isMobile) return '';
    return [paramErrors?.name, paramErrors?.description, paramErrors?.type]
      .filter((error): error is FieldError => !!error)
      .map((error) => error.message)
      .join('\n');
  }, [paramErrors?.name, paramErrors?.description, paramErrors?.type, isMobile]);

  return (
    <EuiTableRow
      key={paramField.id}
      css={css`
        &:hover {
          background-color: inherit; /* Disable row hover effect */
        }
      `}
    >
      <EuiTableRowCell>
        {!isMobile &&
          ((errorMessages && (
            <EuiIconTip
              content={errorMessages}
              type="errorFilled"
              color={euiTheme.colors.danger}
              size="m"
            />
          )) ||
            (warning && (
              <EuiIconTip
                content={warning}
                type="warningFilled"
                color={euiTheme.colors.warning}
                size="m"
              />
            )) ||
            (source === EsqlParamSource.Inferred ? (
              <EuiIcon type="sparkles" color="subdued" size="m" />
            ) : (
              <EuiIcon type="documentEdit" color="subdued" size="m" />
            )))}
      </EuiTableRowCell>
      <EuiTableRowCell
        textOnly={false}
        mobileOptions={{
          header: i18nMessages.paramNameLabel,
          width: '100%',
        }}
      >
        <Controller
          control={control}
          name={`params.${index}.name`}
          render={({
            field: { ref, onChange, onBlur, ...field },
            fieldState: { invalid, error },
          }) => (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFieldText
                compressed
                fullWidth
                placeholder={i18nMessages.paramNamePlaceholder}
                inputRef={ref}
                isInvalid={invalid}
                onBlur={handleValidation}
                onChange={(event) => {
                  onChange(event);
                  if (source === EsqlParamSource.Inferred) {
                    setValue(`params.${index}.source`, EsqlParamSource.Custom);
                  }
                  if (isSubmitted) {
                    handleValidation();
                  }
                }}
                {...field}
              />
              {isMobile &&
                (invalid && error?.message ? (
                  <EuiText size="xs" color="danger">
                    {error.message}
                  </EuiText>
                ) : (
                  warning && (
                    <EuiText size="xs" color="warning">
                      {warning}
                    </EuiText>
                  )
                ))}
            </EuiFlexGroup>
          )}
        />
      </EuiTableRowCell>
      <EuiTableRowCell
        textOnly={false}
        mobileOptions={{
          header: i18nMessages.paramDescriptionLabel,
          width: '100%',
        }}
      >
        <Controller
          control={control}
          name={`params.${index}.description`}
          render={({ field: { ref, ...field }, fieldState: { invalid, error } }) => (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFieldText
                compressed
                fullWidth
                placeholder={i18nMessages.paramDescriptionPlaceholder}
                inputRef={ref}
                isInvalid={invalid}
                {...field}
              />
              {isMobile && invalid && error?.message && (
                <EuiText size="xs" color="danger">
                  {error.message}
                </EuiText>
              )}
            </EuiFlexGroup>
          )}
        />
      </EuiTableRowCell>
      <EuiTableRowCell
        textOnly={false}
        mobileOptions={{
          header: i18nMessages.paramTypeLabel,
          width: '100%',
        }}
      >
        <Controller
          control={control}
          name={`params.${index}.type`}
          render={({ field: { ref, ...field }, fieldState: { invalid, error } }) => (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiSuperSelect
                compressed
                fullWidth
                popoverProps={{
                  panelMinWidth: 150,
                  zIndex: (euiTheme.levels.header as number) - 1, // ensure the popover doesn't render on top of the bottom bar
                }}
                options={Object.values(EsqlToolFieldType).map((option) => ({
                  value: option,
                  inputDisplay: (
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiToken
                          iconType={FIELD_TYPE_TOKEN_MAP[option]}
                          css={css`
                            width: ${euiTheme.size.m};
                            height: ${euiTheme.size.m};
                          `}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>{option}</EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                }))}
                valueOfSelected={field.value}
                isInvalid={invalid}
                {...field}
              />
              {isMobile && invalid && error?.message && (
                <EuiText size="xs" color="danger">
                  {error.message}
                </EuiText>
              )}
            </EuiFlexGroup>
          )}
        />
      </EuiTableRowCell>
      <EuiTableRowCell hasActions>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          onClick={() => {
            removeParamField(index);
            triggerEsqlParamFieldsValidation(['name']);
          }}
          size="s"
          aria-label={i18nMessages.removeParamButtonLabel}
        />
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
