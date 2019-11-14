/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormRow, UseField, SerializerFunc } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { PARAMETERS_DEFINITION } from '../../../constants';
import { NormalizedField, NormalizedFields, AliasOption } from '../../../types';

const targetFieldTypeNotAllowed = PARAMETERS_DEFINITION.path.targetTypesNotAllowed;

const getSuggestedFields = (
  allFields: NormalizedFields['byId'],
  currentField?: NormalizedField
): AliasOption[] =>
  Object.entries(allFields)
    .filter(([id, field]) => {
      if (currentField && id === currentField.id) {
        return false;
      }

      // An alias cannot point certain field types ("object", "nested", "alias")
      if (targetFieldTypeNotAllowed.includes(field.source.type)) {
        return false;
      }

      return true;
    })
    .map(([id, field]) => ({
      id,
      label: field.path,
    }))
    .sort((a, b) => (a.label > b.label ? 1 : a.label < b.label ? -1 : 0));

const getDeserializer = (allFields: NormalizedFields['byId']): SerializerFunc => (
  value: string | object
): AliasOption[] => {
  if (typeof value === 'string' && Boolean(value)) {
    return [
      {
        id: value,
        label: allFields[value].path,
      },
    ];
  }

  return [];
};

interface Props {
  allFields: NormalizedFields['byId'];
  field?: NormalizedField;
}

export const PathParameter = ({ field, allFields }: Props) => (
  <UseField
    path="path"
    config={{
      ...getFieldConfig('path'),
      deserializer: getDeserializer(allFields),
    }}
  >
    {pathField => {
      const error = pathField.getErrorsMessages();
      const isInvalid = error ? Boolean(error.length) : false;

      return (
        <FormRow
          title={
            <h3>
              {i18n.translate('xpack.idxMgmt.mappingsEditor.aliasType.aliasTargetFieldTitle', {
                defaultMessage: 'Alias target',
              })}
            </h3>
          }
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.aliasType.aliasTargetFieldDescription',
            {
              defaultMessage:
                'Select the field you want your alias to point to. You will then be able to use the alias instead of the target field in search requests, and selected other APIs like field capabilities.',
            }
          )}
          idAria="mappingsEditorPathParameter"
        >
          <EuiFormRow
            label={pathField.label}
            helpText={pathField.helpText}
            error={error}
            isInvalid={isInvalid}
          >
            <EuiComboBox
              placeholder="Select a field"
              singleSelection={{ asPlainText: true }}
              options={getSuggestedFields(allFields, field)}
              selectedOptions={pathField.value as AliasOption[]}
              onChange={value => pathField.setValue(value)}
              isClearable={false}
            />
          </EuiFormRow>
        </FormRow>
      );
    }}
  </UseField>
);
