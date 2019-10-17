/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormDataProvider, SelectField, UseField, FieldConfig } from '../../../../shared_imports';
import { MainType, ParameterName } from '../../../../types';
import {
  DATA_TYPE_DEFINITION,
  FIELD_TYPES_OPTIONS,
  PARAMETERS_DEFINITION,
} from '../../../../constants';
import { NameParameter } from '../../field_parameters';

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

interface Props {
  defaultValue: { [key: string]: any };
}

export const EditFieldHeaderForm = ({ defaultValue }: Props) => {
  return (
    <FormDataProvider pathsToWatch="type">
      {formData => {
        const selectedDatatype = formData.type as MainType;
        const typeDefinition = DATA_TYPE_DEFINITION[selectedDatatype];

        return (
          <EuiFlexGroup gutterSize="s">
            {/* Field name */}
            <EuiFlexItem>
              <NameParameter />
            </EuiFlexItem>

            {/* Field type */}
            <EuiFlexItem>
              <UseField
                path="type"
                config={getFieldConfig('type')}
                defaultValue={undefined}
                component={SelectField}
                componentProps={{
                  euiFieldProps: {
                    options: FIELD_TYPES_OPTIONS,
                    hasNoInitialSelection: true,
                  },
                }}
              />
            </EuiFlexItem>

            {/* Field sub type (if any) */}
            {typeDefinition && typeDefinition.subTypes && (
              <EuiFlexItem grow={false}>
                <UseField
                  path="subType"
                  defaultValue={undefined}
                  config={{
                    ...getFieldConfig('type'),
                    label: typeDefinition.subTypes.label,
                  }}
                  component={SelectField}
                  componentProps={{
                    euiFieldProps: {
                      options: typeDefinition.subTypes.types.map(type => ({
                        value: type,
                        text: type,
                      })),
                      hasNoInitialSelection: false,
                    },
                  }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      }}
    </FormDataProvider>
  );
};
