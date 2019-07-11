/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiButtonIcon,
  EuiFormRow,
} from '@elastic/eui';
import {
  UseField,
  Form,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { parameters } from '../parameters';
import { dataTypesConfig, DataTypeConfig } from '../data_types_config';
import { PropertyCommonParameters } from './property_common_parameters';

interface Props {
  form: Form;
  onRemove: () => void;
  fieldPathPrefix?: string;
}

export const MappingsProperty = ({ onRemove, fieldPathPrefix = '', form }: Props) => {
  const [propertyType, setPropertyType] = useState<DataTypeConfig>(
    dataTypesConfig.find(config => config.value === 'text')!
  );

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <UseField
            path={`${fieldPathPrefix}name`}
            form={form}
            component={Field}
            config={parameters.name.fieldConfig}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UseField
            path={`${fieldPathPrefix}type`}
            form={form}
            config={parameters.type.fieldConfig}
          >
            {field => (
              <EuiFormRow label={field.label} helpText={field.helpText} fullWidth>
                <EuiSelect
                  fullWidth
                  value={field.value as string}
                  onChange={({ target: { value } }) => {
                    setPropertyType(dataTypesConfig.find(config => config.value === value)!);
                    field.setValue(value);
                  }}
                  hasNoInitialSelection={true}
                  isInvalid={false}
                  options={dataTypesConfig.map(({ value, text }) => ({ value, text }))}
                />
              </EuiFormRow>
            )}
          </UseField>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonIcon
            color="danger"
            iconType="cross"
            onClick={onRemove}
            aria-label="Remove property"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PropertyCommonParameters
        form={form}
        typeConfig={propertyType}
        fieldPathPrefix={fieldPathPrefix}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
};
