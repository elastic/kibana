/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import {
  UseField,
  Form,
  FormDataProvider,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { parametersDefinition, dataTypesDefinition, DataType } from '../config';
import { PropertyBasicParameters } from './property_basic_parameters';
import { PropertiesManager } from './properties_manager';

interface Props {
  form: Form;
  onRemove: () => void;
  fieldPathPrefix?: string;
}

const hasNestedProperties = (selectedDatatype: string) =>
  selectedDatatype === 'object' || selectedDatatype === 'nested';

export const PropertyEditor = ({ onRemove, fieldPathPrefix = '', form }: Props) => {
  return (
    <FormDataProvider form={form} pathsToWatch={`${fieldPathPrefix}type`}>
      {formData => {
        const selectedDatatype = formData[`${fieldPathPrefix}type`] as DataType;
        const typeDefinition = dataTypesDefinition[selectedDatatype];

        return (
          <Fragment>
            <EuiFlexGroup justifyContent="spaceBetween">
              {/* Field name */}
              <EuiFlexItem grow={false}>
                <UseField
                  path={`${fieldPathPrefix}name`}
                  form={form}
                  config={parametersDefinition.name.fieldConfig}
                  component={Field}
                />
              </EuiFlexItem>

              {/* Field type */}
              <EuiFlexItem grow={false}>
                <UseField
                  path={`${fieldPathPrefix}type`}
                  form={form}
                  config={parametersDefinition.type.fieldConfig}
                  component={Field}
                  componentProps={{
                    fieldProps: {
                      options: Object.entries(dataTypesDefinition).map(([value, { label }]) => ({
                        value,
                        text: label,
                      })),
                    },
                  }}
                />
              </EuiFlexItem>

              {/* Field configuration (if any) */}
              {typeDefinition.configuration &&
                typeDefinition.configuration.map((parameter, i) => (
                  <EuiFlexItem key={i} grow={false}>
                    <UseField
                      form={form}
                      path={fieldPathPrefix + parameter}
                      config={
                        parametersDefinition[parameter] &&
                        parametersDefinition[parameter].fieldConfig
                      }
                      component={Field}
                    />
                  </EuiFlexItem>
                ))}
              <EuiFlexItem />

              {/* Delete field button */}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="danger"
                  iconType="cross"
                  onClick={onRemove}
                  aria-label="Remove property"
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            {/* Basic parameters for the selected type */}
            <PropertyBasicParameters
              form={form}
              typeDefinition={typeDefinition}
              fieldPathPrefix={fieldPathPrefix}
            />

            {hasNestedProperties(selectedDatatype) && (
              <Fragment>
                <EuiSpacer size="l" />
                <PropertiesManager form={form} path={`${fieldPathPrefix}properties`} />
              </Fragment>
            )}

            <EuiSpacer size="l" />
          </Fragment>
        );
      }}
    </FormDataProvider>
  );
};
