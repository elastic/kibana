/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  UseField,
  SelectField,
  SuperSelectField,
  TextField,
  FieldConfig,
  FieldHook,
} from '../../shared_imports';
import { SelectOption, SuperSelectOption } from '../../types';

interface Props {
  path: string;
  options: SuperSelectOption[] | SelectOption[];
  defaultValue: string | undefined;
  label?: string;
  isSuperSelect?: boolean;
  config: FieldConfig;
}

export const SelectWithCustom = <IsSuperSelect extends true | false = true>({
  path,
  options,
  defaultValue,
  config,
  label,
  isSuperSelect = false,
}: Props) => {
  const isDefaultValueInOptions =
    defaultValue === undefined || options.some((option: any) => option.value === defaultValue);

  const [isCustom, setIsCustom] = useState<boolean>(!isDefaultValueInOptions);

  const fieldConfig = label !== undefined ? { ...config, label } : config;

  const toggleCustom = (field: FieldHook) => () => {
    if (isCustom) {
      field.setValue(options[0].value);
    } else {
      field.setValue('');
    }

    field.reset({ resetValue: false });

    setIsCustom(!isCustom);
  };

  return (
    <UseField path={path} config={fieldConfig}>
      {field => (
        <div className="mappingsEditor__selectWithCustom">
          <EuiButtonEmpty
            size="xs"
            onClick={toggleCustom(field)}
            className="mappingsEditor__selectWithCustom__button"
          >
            {isCustom
              ? i18n.translate('xpack.idxMgmt.mappingsEditor.predefinedButtonLabel', {
                  defaultMessage: 'Use predefined',
                })
              : i18n.translate('xpack.idxMgmt.mappingsEditor.customButtonLabel', {
                  defaultMessage: 'Add custom',
                })}
          </EuiButtonEmpty>

          {isCustom ? (
            <TextField field={field} />
          ) : isSuperSelect ? (
            <SuperSelectField field={field} euiFieldProps={{ options }} />
          ) : (
            <SelectField
              field={field}
              euiFieldProps={{ options: options as any, hasNoInitialSelection: false }}
            />
          )}
        </div>
      )}
    </UseField>
  );
};
