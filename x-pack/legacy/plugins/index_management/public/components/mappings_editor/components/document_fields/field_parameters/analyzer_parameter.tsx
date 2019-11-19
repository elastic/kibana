/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UseField, TextField, FieldConfig, FieldHook } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { PARAMETERS_OPTIONS } from '../../../constants';
import { AnalyzerParameterSelects, mapOptionsToSubOptions } from './analyzer_parameter_selects';

interface Props {
  path: string;
  defaultValue: string | undefined;
  label?: string;
  config?: FieldConfig;
}

const fieldOptions = PARAMETERS_OPTIONS.analyzer!;

export const AnalyzerParameter = ({ path, defaultValue, label, config }: Props) => {
  const isDefaultValueInOptions =
    defaultValue === undefined || fieldOptions.some((option: any) => option.value === defaultValue);

  let mainValue: string | undefined = defaultValue;
  let subValue: string | undefined;
  let isDefaultValueInSubOptions = false;

  if (!isDefaultValueInOptions && mapOptionsToSubOptions !== undefined) {
    // Check if the default value is one of the subOptions
    for (const [key, subOptions] of Object.entries(mapOptionsToSubOptions)) {
      if (subOptions.options.some((option: any) => option.value === defaultValue)) {
        isDefaultValueInSubOptions = true;
        mainValue = key;
        subValue = defaultValue;
        break;
      }
    }
  }

  const [isCustom, setIsCustom] = useState<boolean>(
    !isDefaultValueInOptions && !isDefaultValueInSubOptions
  );

  const fieldConfig = config ? config : getFieldConfig('analyzer');
  const fieldConfigWithLabel = label !== undefined ? { ...fieldConfig, label } : fieldConfig;

  const toggleCustom = (field: FieldHook) => () => {
    if (isCustom) {
      field.setValue(fieldOptions[0].value);
    } else {
      field.setValue('');
    }

    field.reset({ resetValue: false });

    setIsCustom(!isCustom);
  };

  return (
    <UseField path={path} config={fieldConfigWithLabel}>
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
            // Wrap inside a flex item to maintain the same padding
            // around the field.
            <EuiFlexGroup>
              <EuiFlexItem>
                <TextField field={field} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <AnalyzerParameterSelects
              onChange={field.setValue}
              mainDefaultValue={mainValue}
              subDefaultValue={subValue}
              config={fieldConfigWithLabel}
            />
          )}
        </div>
      )}
    </UseField>
  );
};
