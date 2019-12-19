/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiComboBox } from '@elastic/eui';

import { UseField, useFormContext } from '../../../../shared_imports';
import { MainType, SubType, Field, ComboBoxOption } from '../../../../types';
import { getFieldConfig, filterTypesForMultiField } from '../../../../lib';
import { TYPE_DEFINITION } from '../../../../constants';

import { NameParameter, TypeParameter } from '../../field_parameters';

interface Props {
  type: MainType;
  defaultValue: Field;
  isMultiField: boolean;
}

export const EditFieldHeaderForm = React.memo(({ type, defaultValue, isMultiField }: Props) => {
  const typeDefinition = TYPE_DEFINITION[type];
  const hasSubType = typeDefinition.subTypes !== undefined;
  const form = useFormContext();

  const subTypeOptions = hasSubType
    ? typeDefinition
        .subTypes!.types.map(_subType => TYPE_DEFINITION[_subType])
        .map(_subType => ({ value: _subType.value, label: _subType.label }))
    : undefined;

  const defaultValueSubType = hasSubType
    ? typeDefinition.subTypes!.types.includes(defaultValue.type as SubType)
      ? defaultValue.type // we use the default value provided
      : typeDefinition.subTypes!.types[0] // we set the first item from the subType array
    : undefined;

  const onTypeChange = (value: ComboBoxOption[]) => {
    if (value.length) {
      form.setFieldValue('type', value);

      const nextTypeDefinition = TYPE_DEFINITION[value[0].value as MainType];

      if (nextTypeDefinition.subTypes !== undefined) {
        /**
         * We need to manually set the subType field value because if we edit a field type that already has a subtype
         * (e.g. "numeric" with subType "float"), and we change the type to another one that also has subTypes (e.g. "range"),
         * the old value would be kept on the subType.
         */
        const subTypeValue = nextTypeDefinition.subTypes!.types[0];
        form.setFieldValue('subType', [TYPE_DEFINITION[subTypeValue]]);
      }
    }
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        {/* Field name */}
        <EuiFlexItem>
          <NameParameter />
        </EuiFlexItem>

        {/* Field type */}
        <EuiFlexItem>
          <TypeParameter isMultiField={isMultiField} onTypeChange={onTypeChange} />
        </EuiFlexItem>

        {/* Field sub type (if any) */}
        {hasSubType && (
          <EuiFlexItem>
            <UseField
              path="subType"
              config={{
                ...getFieldConfig('type'),
                label: typeDefinition.subTypes!.label,
                defaultValue: defaultValueSubType,
              }}
            >
              {subTypeField => {
                return (
                  <EuiFormRow label={subTypeField.label}>
                    <EuiComboBox
                      placeholder={i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.subTypeField.placeholderLabel',
                        {
                          defaultMessage: 'Select a type',
                        }
                      )}
                      singleSelection={{ asPlainText: true }}
                      options={
                        isMultiField ? filterTypesForMultiField(subTypeOptions!) : subTypeOptions
                      }
                      selectedOptions={subTypeField.value as ComboBoxOption[]}
                      onChange={subType => subTypeField.setValue(subType)}
                      isClearable={false}
                    />
                  </EuiFormRow>
                );
              }}
            </UseField>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
});
