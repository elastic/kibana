/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React, { useCallback, useMemo } from 'react';
import {
  type FieldHook,
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiCheckboxGroup, EuiFormRow } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  CheckboxGroupFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';

type CheckboxGroupProps = z.infer<typeof CheckboxGroupFieldSchema> & ConditionRenderProps;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return toStringArray(value);
  if (typeof value === 'string' && value !== '') {
    try {
      const parsed = JSON.parse(value);
      return toStringArray(parsed);
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
  const options = useMemo(
    () => metadata.options.map((option) => ({ id: option, label: option })),
    [metadata.options]
  );

  const config = useMemo(
    () => ({
      defaultValue: JSON.stringify(metadata.default ?? []),
      validations: isRequired
        ? [
            {
              validator: ({ value }: { value: unknown }) => {
                if (toArray(value).length === 0) {
                  return { message: FIELD_REQUIRED };
                }
              },
            },
          ]
        : [],
    }),
    [isRequired, metadata.default]
  );

  const renderField = useCallback(
    (field: FieldHook<string>) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const selected = toArray(field.value);
      const handleChange = (id: string) => {
        const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
        field.setValue(JSON.stringify(next));
      };
      return (
        <EuiFormRow label={label} error={errorMessage} isInvalid={isInvalid} fullWidth>
          <EuiCheckboxGroup
            options={options}
            idToSelectedMap={Object.fromEntries(selected.map((id) => [id, true]))}
            onChange={handleChange}
          />
        </EuiFormRow>
      );
    },
    [label, options]
  );

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`}
      config={config}
    >
      {renderField}
    </UseField>
  );
};
CheckboxGroup.displayName = 'CheckboxGroup';
