/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiIcon,
  EuiSelect,
  EuiTableRow,
  EuiTableRowCell,
  EuiToolTip,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EsqlToolFieldType } from '@kbn/onechat-common';
import { capitalize } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import {
  Controller,
  FieldArrayWithId,
  FieldError,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useEsqlParamsValidation } from '../hooks/use_esql_params_validation';
import { i18nMessages } from '../i18n';
import { OnechatEsqlToolFormData } from '../types/esql_tool_form_types';

interface EsqlParamRowProps {
  index: number;
  paramField: FieldArrayWithId<OnechatEsqlToolFormData, 'params', 'id'>;
  removeParamField: (index: number) => void;
}

export const EsqlParamRow: React.FC<EsqlParamRowProps> = ({
  index,
  paramField,
  removeParamField,
}) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { control, formState } = useFormContext<OnechatEsqlToolFormData>();
  const { errors, isSubmitted } = formState;

  const { triggerEsqlParamWarnings, triggerEsqlParamFieldsValidation } = useEsqlParamsValidation();

  const handleValidation = useCallback(() => {
    triggerEsqlParamFieldsValidation(['name']);
    triggerEsqlParamWarnings();
  }, [triggerEsqlParamFieldsValidation, triggerEsqlParamWarnings]);

  const warning = useWatch({
    control,
    name: `params.${index}.warning`,
  });

  const paramErrors = errors.params?.[index];
  const errorMessages = useMemo(() => {
    return [paramErrors?.name, paramErrors?.description, paramErrors?.type]
      .filter((error): error is FieldError => !!error)
      .map((error) => error.message)
      .join('\n');
  }, [paramErrors?.name, paramErrors?.description, paramErrors?.type]);

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
        {errorMessages ? (
          <EuiToolTip content={errorMessages}>
            <EuiIcon type="errorFilled" color={euiTheme.colors.danger} size="m" />
          </EuiToolTip>
        ) : (
          warning && (
            <EuiToolTip content={warning}>
              <EuiIcon type="warningFilled" color={euiTheme.colors.warning} size="m" />
            </EuiToolTip>
          )
        )}
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
          render={({ field: { ref, onChange, onBlur, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              compressed
              fullWidth={isMobile}
              placeholder={i18nMessages.paramNamePlaceholder}
              inputRef={ref}
              isInvalid={invalid}
              onBlur={handleValidation}
              onChange={(event) => {
                onChange(event);
                if (isSubmitted) {
                  handleValidation();
                }
              }}
              {...field}
            />
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
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              compressed
              fullWidth={isMobile}
              placeholder={i18nMessages.paramDescriptionPlaceholder}
              inputRef={ref}
              isInvalid={invalid}
              {...field}
            />
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
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiSelect
              compressed
              fullWidth={isMobile}
              options={Object.values(EsqlToolFieldType).map((option) => ({
                value: option,
                text: capitalize(option),
              }))}
              inputRef={ref}
              isInvalid={invalid}
              {...field}
            />
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
