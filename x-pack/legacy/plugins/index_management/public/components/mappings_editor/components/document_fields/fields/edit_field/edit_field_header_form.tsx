/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormDataProvider, SelectField, UseField, FieldConfig } from '../../../../shared_imports';
import { MainType, ParameterName, Field } from '../../../../types';
import {
  TYPE_DEFINITION,
  FIELD_TYPES_OPTIONS,
  MULTIFIELD_TYPES_OPTIONS,
  PARAMETERS_DEFINITION,
} from '../../../../constants';
import { NameParameter } from '../../field_parameters';

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

interface Props {
  isMultiField: boolean;
  defaultValue: Field;
}

export const EditFieldHeaderForm = ({ isMultiField, defaultValue }: Props) => {
  return (
    <FormDataProvider pathsToWatch="type">
      {formData => {
        const selectedDatatype = formData.type as MainType;
        const typeDefinition = TYPE_DEFINITION[selectedDatatype];
        const subTypeOptions =
          typeDefinition && typeDefinition.subTypes
            ? typeDefinition.subTypes.types
                .map(subType => TYPE_DEFINITION[subType])
                .map(subType => ({ value: subType.value, text: subType.label }))
            : undefined;

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
                    options: isMultiField ? MULTIFIELD_TYPES_OPTIONS : FIELD_TYPES_OPTIONS,
                    hasNoInitialSelection: true,
                  },
                }}
              />
            </EuiFlexItem>

            {/* Field sub type (if any) */}
            {subTypeOptions && (
              <EuiFlexItem grow={false}>
                <UseField
                  path="subType"
                  defaultValue={
                    defaultValue.subType === undefined
                      ? typeDefinition.subTypes!.types[0]
                      : defaultValue.subType
                  }
                  config={{
                    ...getFieldConfig('type'),
                    label: typeDefinition.subTypes!.label,
                  }}
                  component={SelectField}
                  componentProps={{
                    euiFieldProps: {
                      options: subTypeOptions,
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
