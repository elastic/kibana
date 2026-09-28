/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';

type BooleanEuiFieldProps = Partial<EuiSwitchProps>;
type BooleanWidgetProps = BaseWidgetProps<z.ZodBoolean, BooleanEuiFieldProps>;

const BooleanField = ({
  field,
  euiFieldProps = {},
  ...rest
}: {
  field: FieldHook<boolean>;
  euiFieldProps?: BooleanEuiFieldProps;
}) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      {...rest}
    >
      <EuiSwitch
        {...euiFieldProps}
        label={field.label}
        checked={Boolean(field.value)}
        onChange={(event) => field.setValue(event.target.checked)}
      />
    </EuiFormRow>
  );
};

export const BooleanWidget: React.FC<BooleanWidgetProps> = ({ path, fieldProps, fieldConfig }) => (
  <UseField path={path} component={BooleanField} config={fieldConfig} componentProps={fieldProps} />
);
