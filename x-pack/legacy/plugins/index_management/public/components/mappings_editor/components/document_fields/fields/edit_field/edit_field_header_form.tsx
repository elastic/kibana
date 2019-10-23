/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  FormDataProvider,
  SelectField,
  UseField,
  FieldConfig,
  FieldHook,
} from '../../../../shared_imports';
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
  const onTypeChange = (field: FieldHook) => (e: ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.currentTarget;
    const typeDefinition = TYPE_DEFINITION[value as MainType];
    const hasSubType = typeDefinition.subTypes !== undefined;
    const subTypeField = field.form.getFields().subType;

    if (hasSubType && subTypeField) {
      /**
       * We need to manually set the subType field value because if we edit a field type that already has a subtype
       * (e.g. "numeric" with subType "float"), and we change the type to another one that also has subTypes (e.g. "range").
       * If we then immediately click the "update" button, _without_ changing the subType, the old value of subType
       * is maintained.
       */
      subTypeField.setValue(typeDefinition.subTypes!.types[0]);
    }

    field.setValue(value);
  };

  return (
    <FormDataProvider pathsToWatch="type">
      {formData => {
        const type = formData.type as MainType;

        if (!type) {
          return null;
        }

        const typeDefinition = TYPE_DEFINITION[type];
        const hasSubType = typeDefinition.subTypes !== undefined;

        const subTypeOptions = hasSubType
          ? typeDefinition
              .subTypes!.types.map(subType => TYPE_DEFINITION[subType])
              .map(subType => ({ value: subType.value, text: subType.label }))
          : undefined;

        const defaultValueSubType = hasSubType
          ? defaultValue.subType === undefined || type !== defaultValue.type
            ? typeDefinition.subTypes!.types[0]
            : defaultValue.subType
          : undefined;

        return (
          <EuiFlexGroup gutterSize="s">
            {/* Field name */}
            <EuiFlexItem>
              <NameParameter />
            </EuiFlexItem>

            {/* Field type */}
            <EuiFlexItem>
              <UseField path="type" config={getFieldConfig('type')}>
                {field => (
                  <SelectField
                    field={field}
                    euiFieldProps={{
                      options: isMultiField ? MULTIFIELD_TYPES_OPTIONS : FIELD_TYPES_OPTIONS,
                      hasNoInitialSelection: true,
                      onChange: onTypeChange(field),
                    }}
                  />
                )}
              </UseField>
            </EuiFlexItem>

            {/* Field sub type (if any) */}
            {hasSubType && (
              <EuiFlexItem grow={false}>
                <UseField
                  path="subType"
                  defaultValue={defaultValueSubType}
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
