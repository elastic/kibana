/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UseField, SelectField, TextField, FieldConfig, FieldHook } from '../../shared_imports';
import { SelectOption } from '../../types';

interface Props {
  path: string;
  options: SelectOption[];
  defaultValue: string | undefined;
  label?: string;
  config: FieldConfig;
}

export const SelectWithCustom = ({ path, options, defaultValue, config, label }: Props) => {
  const isDefaultValueInOptions =
    defaultValue === undefined || options.some(option => option.value === defaultValue);

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
          ) : (
            <SelectField field={field} euiFieldProps={{ options, hasNoInitialSelection: false }} />
          )}
        </div>
      )}
    </UseField>
  );
};
