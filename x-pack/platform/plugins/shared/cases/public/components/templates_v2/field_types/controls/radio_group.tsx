/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { InlineFieldActions } from './inline_field_actions';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  RadioGroupFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import * as i18n from '../../translations';
import { getFieldRequirementLabel } from '../../../optional_field_label';

type RadioGroupProps = z.infer<typeof RadioGroupFieldSchema> & ConditionRenderProps;

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  type,
  metadata,
  isRequired,
  isRequiredOnClose,
  onConfirm,
  isSaving,
  isSaveDisabled,
}) => {
  const { control, setValue, resetField } = useFormContext();
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;
  const firstOption = metadata.options[0];
  const defaultValue = metadata.default ?? firstOption;

  const options = useMemo(
    () => metadata.options.map((option) => ({ id: option, label: option })),
    [metadata.options]
  );

  const rules = useMemo(() => {
    if (!isRequired) return undefined;
    return {
      validate: {
        required: (value: unknown) => (value ? true : i18n.FIELD_REQUIRED),
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
      render={({ field, fieldState }) => (
        <>
          <RadioGroupRender
            name={name}
            path={path}
            label={label ?? ''}
            isRequired={isRequired ?? false}
            isRequiredOnClose={isRequiredOnClose ?? false}
            options={options}
            firstOption={firstOption}
            value={typeof field.value === 'string' ? field.value : ''}
            isInvalid={Boolean(fieldState.error)}
            errorMessage={fieldState.error?.message}
            isDisabled={isSaving}
            onChange={(id) => {
              field.onChange(id);
              field.onBlur();
            }}
            setValue={setValue}
          />
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
      )}
    />
  );
};
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupRenderProps {
  name: string;
  path: string;
  label: string;
  isRequired: boolean;
  isRequiredOnClose: boolean;
  options: Array<{ id: string; label: string }>;
  firstOption: string;
  value: string;
  isInvalid: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  onChange: (next: string) => void;
  setValue: ReturnType<typeof useFormContext>['setValue'];
}

const RadioGroupRender: React.FC<RadioGroupRenderProps> = ({
  name,
  path,
  label,
  isRequired,
  isRequiredOnClose,
  options,
  firstOption,
  value,
  isInvalid,
  errorMessage,
  isDisabled,
  onChange,
  setValue,
}) => {
  // When the form value is empty (e.g. set to '' by useYamlFormSync when no
  // default is defined in the YAML), sync it to the first available option so
  // the stored value matches what the UI shows as selected. Use shouldDirty:
  // false to avoid spuriously dirtying the form on mount.
  useEffect(() => {
    if (value === '') {
      setValue(path, firstOption, { shouldDirty: false, shouldTouch: false });
    }
  }, [value, firstOption, path, setValue]);

  const idSelected = value !== '' ? value : firstOption;

  return (
    <EuiFormRow
      label={label}
      labelAppend={getFieldRequirementLabel(isRequired, isRequiredOnClose)}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      <EuiRadioGroup
        name={name}
        options={options}
        idSelected={idSelected}
        onChange={onChange}
        disabled={isDisabled}
      />
    </EuiFormRow>
  );
};
RadioGroupRender.displayName = 'RadioGroupRender';
