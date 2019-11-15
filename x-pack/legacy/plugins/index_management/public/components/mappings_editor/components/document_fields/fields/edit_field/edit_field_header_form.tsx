/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SelectField, UseField, FieldHook } from '../../../../shared_imports';
import { MainType, SubType, Field } from '../../../../types';
import { getFieldConfig, filterTypesForMultiField } from '../../../../lib';
import { TYPE_DEFINITION, FIELD_TYPES_OPTIONS } from '../../../../constants';

import { NameParameter } from '../../field_parameters';

interface Props {
  type: MainType;
  defaultValue: Field;
  isMultiField: boolean;
}

export const EditFieldHeaderForm = React.memo(({ type, defaultValue, isMultiField }: Props) => {
  const typeDefinition = TYPE_DEFINITION[type];
  const hasSubType = typeDefinition.subTypes !== undefined;

  const subTypeOptions = hasSubType
    ? typeDefinition
        .subTypes!.types.map(_subType => TYPE_DEFINITION[_subType])
        .map(_subType => ({ value: _subType.value, text: _subType.label }))
    : undefined;

  const defaultValueSubType = hasSubType
    ? typeDefinition.subTypes!.types.includes(defaultValue.type as SubType)
      ? defaultValue.type // we use the default value provided
      : typeDefinition.subTypes!.types[0] // we set the first item from the subType array
    : undefined;

  const onTypeChange = (field: FieldHook) => (e: ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.currentTarget;
    const nextTypeDefinition = TYPE_DEFINITION[value as MainType];
    const nextHasSubType = nextTypeDefinition.subTypes !== undefined;
    const subTypeField = field.form.getFields().subType;

    if (nextHasSubType && subTypeField) {
      /**
       * We need to manually set the subType field value because if we edit a field type that already has a subtype
       * (e.g. "numeric" with subType "float"), and we change the type to another one that also has subTypes (e.g. "range").
       * If we then immediately click the "update" button, _without_ changing the subType, the old value of subType
       * is maintained.
       */
      subTypeField.setValue(nextTypeDefinition.subTypes!.types[0]);
    }

    field.setValue(value);
  };

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
                options: isMultiField
                  ? filterTypesForMultiField(FIELD_TYPES_OPTIONS)
                  : FIELD_TYPES_OPTIONS,
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
            config={{
              ...getFieldConfig('type'),
              label: typeDefinition.subTypes!.label,
            }}
            defaultValue={defaultValueSubType}
            component={SelectField}
            componentProps={{
              euiFieldProps: {
                options: isMultiField ? filterTypesForMultiField(subTypeOptions!) : subTypeOptions,
                hasNoInitialSelection: false,
              },
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
