/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React, { useEffect, useMemo, useState } from 'react';
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
import { OptionalFieldLabel } from '../../../optional_field_label';

type RadioGroupProps = z.infer<typeof RadioGroupFieldSchema> & ConditionRenderProps;

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  type,
  metadata,
  isRequired,
  onConfirm,
}) => {
  const { control, setValue, resetField } = useFormContext();
  const [hasPendingChange, setHasPendingChange] = useState(false);
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

  const showInlineActions = hasPendingChange && onConfirm != null;

  return (
    <>
      <Controller
        key={name}
        name={path}
        control={control}
        rules={rules}
        defaultValue={defaultValue}
        render={({ field, fieldState }) => (
          <RadioGroupRender
            name={name}
            path={path}
            label={label ?? ''}
            isRequired={isRequired ?? false}
            options={options}
            firstOption={firstOption}
            value={typeof field.value === 'string' ? field.value : ''}
            isInvalid={!!fieldState.error}
            errorMessage={fieldState.error?.message}
            onChange={(id) => {
              field.onChange(id);
              field.onBlur();
              setHasPendingChange(true);
            }}
            setValue={setValue}
          />
        )}
      />
      {showInlineActions && (
        <InlineFieldActions
          name={name}
          onConfirm={() => {
            setHasPendingChange(false);
            onConfirm();
          }}
          onCancel={() => {
            setHasPendingChange(false);
            resetField(path);
          }}
        />
      )}
    </>
  );
};
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupRenderProps {
  name: string;
  path: string;
  label: string;
  isRequired: boolean;
  options: Array<{ id: string; label: string }>;
  firstOption: string;
  value: string;
  isInvalid: boolean;
  errorMessage?: string;
  onChange: (next: string) => void;
  setValue: ReturnType<typeof useFormContext>['setValue'];
}

const RadioGroupRender: React.FC<RadioGroupRenderProps> = ({
  name,
  path,
  label,
  isRequired,
  options,
  firstOption,
  value,
  isInvalid,
  errorMessage,
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
      labelAppend={!isRequired ? OptionalFieldLabel : undefined}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      <EuiRadioGroup name={name} options={options} idSelected={idSelected} onChange={onChange} />
    </EuiFormRow>
  );
};
RadioGroupRender.displayName = 'RadioGroupRender';
