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
import { EuiCheckboxGroup, EuiFormRow } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type {
  CheckboxGroupFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';

type CheckboxGroupProps = z.infer<typeof CheckboxGroupFieldSchema> & ConditionRenderProps;

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string' && value !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
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
            if (toArray(value).length === 0) {
              return { message: FIELD_REQUIRED };
            }
          },
        },
      ]
    : [];

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`}
      config={{ validations, defaultValue: JSON.stringify(metadata.default ?? []) }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        const selected = toArray(field.value);
        return (
          <EuiFormRow label={label} error={errorMessage} isInvalid={isInvalid} fullWidth>
            <EuiCheckboxGroup
              options={metadata.options.map((option) => ({ id: option, label: option }))}
              idToSelectedMap={Object.fromEntries(selected.map((id) => [id, true]))}
              onChange={(id) => {
                const next = selected.includes(id)
                  ? selected.filter((s) => s !== id)
                  : [...selected, id];
                field.setValue(JSON.stringify(next));
              }}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
CheckboxGroup.displayName = 'CheckboxGroup';
