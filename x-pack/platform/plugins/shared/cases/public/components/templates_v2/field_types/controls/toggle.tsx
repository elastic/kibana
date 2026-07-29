/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { z } from '@kbn/zod/v4';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { InlineFieldActions } from './inline_field_actions';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  ToggleFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED, TOGGLE_ON, TOGGLE_OFF } from '../../translations';
import { getFieldRequirementLabel } from '../../../optional_field_label';

type ToggleProps = z.infer<typeof ToggleFieldSchema> & ConditionRenderProps;

const isChecked = (value: unknown): boolean => value === true || value === 'true';

const isDefinedToggleValue = (value: unknown): boolean =>
  value === true || value === false || value === 'true' || value === 'false';

export const Toggle = ({
  label,
  name,
  type,
  metadata,
  isRequired,
  isRequiredOnClose,
  onConfirm,
  isSaving,
  isSaveDisabled,
}: ToggleProps) => {
  const { control, resetField } = useFormContext();
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;
  const defaultValue =
    metadata?.default === undefined
      ? isRequired
        ? 'false'
        : ''
      : metadata.default === true
      ? 'true'
      : 'false';

  const rules = useMemo(() => {
    if (!isRequired) {
      return undefined;
    }
    return {
      validate: {
        required: (value: unknown) => (isDefinedToggleValue(value) ? true : FIELD_REQUIRED),
      },
    };
  }, [isRequired]);

  const handleCancel = useCallback(() => {
    resetField(path);
  }, [path, resetField]);

  return (
    <Controller
      key={name}
      name={path}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => {
        const checked = isChecked(field.value);
        return (
          <>
            <EuiFormRow
              label={label}
              labelAppend={getFieldRequirementLabel(isRequired, isRequiredOnClose)}
              isInvalid={!!fieldState.error}
              error={fieldState.error?.message}
              fullWidth
            >
              <EuiSwitch
                data-test-subj={`toggle-field-${name}`}
                label={checked ? TOGGLE_ON : TOGGLE_OFF}
                checked={checked}
                disabled={isSaving}
                onChange={(event) => {
                  field.onChange(event.target.checked ? 'true' : 'false');
                  field.onBlur();
                }}
              />
            </EuiFormRow>
            {fieldState.isDirty && onConfirm && (
              <InlineFieldActions
                name={name}
                onConfirm={onConfirm}
                onCancel={handleCancel}
                isLoading={isSaving}
                isDisabled={isSaveDisabled}
              />
            )}
          </>
        );
      }}
    />
  );
};

Toggle.displayName = 'Toggle';
