/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React from 'react';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type {
  RadioGroupFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import * as i18n from '../../translations';

type RadioGroupProps = z.infer<typeof RadioGroupFieldSchema> & ConditionRenderProps;

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  type,
  metadata,
  isRequired,
}) => {
  const validations = isRequired
    ? [
        {
          validator: ({ value }: { value: unknown }) => {
            if (!value) {
              return { message: i18n.FIELD_REQUIRED };
            }
          },
        },
      ]
    : [];

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`}
      config={{ validations, defaultValue: metadata.default ?? metadata.options[0] }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow label={label} error={errorMessage} isInvalid={isInvalid} fullWidth>
            <EuiRadioGroup
              name={name}
              options={metadata.options.map((option) => ({ id: option, label: option }))}
              idSelected={
                typeof field.value === 'string' && field.value !== ''
                  ? field.value
                  : metadata.options[0]
              }
              onChange={(id) => field.setValue(id)}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
RadioGroup.displayName = 'RadioGroup';
