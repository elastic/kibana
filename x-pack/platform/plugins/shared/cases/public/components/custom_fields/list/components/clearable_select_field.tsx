/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, OptionHTMLAttributes } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiFormRow, EuiSelect, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  type FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export interface Props {
  field: FieldHook;
  isClearable: boolean;
  euiFieldProps: {
    options: Array<
      { text: string | ReactNode; [key: string]: unknown } & OptionHTMLAttributes<HTMLOptionElement>
    >;
    [key: string]: unknown;
  };
  idAria?: string;
  [key: string]: unknown;
}

const ClearableSelectFieldComponent = ({
  field,
  euiFieldProps,
  idAria,
  isClearable,
  ...rest
}: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiSelect
        fullWidth
        value={field.value as string}
        onChange={(e) => {
          field.setValue(e.target.value);
        }}
        hasNoInitialSelection={true}
        isInvalid={isInvalid}
        data-test-subj="select"
        append={
          isClearable && field.value ? (
            <EuiButtonIcon
              css={css`
                /* Approximation of the clear button from EuiComboBox */
                position: absolute;
                right: 52px;
                border-radius: 50%;
                background-color: ${euiTheme.colors.borderBaseFormsControl};
                color: ${euiTheme.colors.textInverse};
                height: 16px;
                width: 16px;
                inline-size: 16px !important;
                block-size: 16px !important;
                &:hover,
                &:active,
                &:focus {
                  background-color: ${euiTheme.colors.borderBaseFormsControl};
                  color: ${euiTheme.colors.textInverse};
                }
                &:focus {
                  outline: ${euiTheme.colors.borderStrongPrimary} solid 2px;
                }
                &:focus:not(:focus-visible) {
                  outline: none;
                }
                & svg {
                  transform: scale(0.75);
                  stroke-width: 2px;
                }
              `}
              iconType="cross"
              className="euiFormControlLayoutClearButton"
              onClick={() => field.setValue(null)}
            />
          ) : undefined
        }
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

ClearableSelectFieldComponent.displayName = 'ClearableSelectField';

export const ClearableSelectField = React.memo(ClearableSelectFieldComponent);
