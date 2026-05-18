/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React, { useEffect, useMemo } from 'react';
import {
  type FieldHook,
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  RadioGroupFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import * as i18n from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

type RadioGroupProps = z.infer<typeof RadioGroupFieldSchema> & ConditionRenderProps;

interface RadioGroupFieldProps {
  field: FieldHook<string>;
  label: string;
  name: string;
  options: Array<{ id: string; label: string }>;
  firstOption: string;
  isRequired: boolean;
}

const RadioGroupField: React.FC<RadioGroupFieldProps> = ({
  field,
  label,
  name,
  options,
  firstOption,
  isRequired,
}) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  // When the form value is empty (e.g. set to '' by useYamlFormSync when no
  // default is defined in the YAML), sync it to the first available option so
  // the stored value matches what the UI shows as selected.
  useEffect(() => {
    if (field.value === '') {
      field.setValue(firstOption);
    }
    // field.setValue is a stable reference; only re-run when the value or the
    // first option changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value, firstOption]);

  const idSelected =
    typeof field.value === 'string' && field.value !== '' ? field.value : firstOption;

  return (
    <EuiFormRow
      label={label}
      labelAppend={!isRequired ? OptionalFieldLabel : undefined}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      <EuiRadioGroup
        name={name}
        options={options}
        idSelected={idSelected}
        onChange={field.setValue}
      />
    </EuiFormRow>
  );
};
RadioGroupField.displayName = 'RadioGroupField';

export const RadioGroup: React.FC<RadioGroupProps> = ({
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
      defaultValue: metadata.default ?? metadata.options[0],
      validations: isRequired
        ? [
            {
              validator: ({ value }: { value: unknown }) => {
                if (!value) {
                  return { message: i18n.FIELD_REQUIRED };
                }
              },
            },
          ]
        : [],
    }),
    [isRequired, metadata.default, metadata.options]
  );

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`}
      config={config}
    >
      {(field: FieldHook<string>) => (
        <RadioGroupField
          field={field}
          label={label ?? ''}
          name={name}
          isRequired={isRequired ?? false}
          options={options}
          firstOption={metadata.options[0]}
        />
      )}
    </UseField>
  );
};
RadioGroup.displayName = 'RadioGroup';
