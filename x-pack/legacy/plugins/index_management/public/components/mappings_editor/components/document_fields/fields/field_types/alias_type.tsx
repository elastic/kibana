/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import { SerializerFunc } from 'src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { NormalizedField, NormalizedFields, AliasOption } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, FormRow } from '../../../../shared_imports';
import { EditFieldSection } from '../edit_field';

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
}

const getSuggestedFields = (
  currentField: NormalizedField,
  allFields: NormalizedFields['byId']
): AliasOption[] =>
  Object.entries(allFields)
    .filter(([id, field]) => {
      if (id === currentField.id) {
        return false;
      }

      // An alias cannot point to an "object" or "nested" type
      if (field.canHaveChildFields) {
        return false;
      }

      // An alias cannot point to another alias
      if (field.source.type === 'alias') {
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

export const AliasType = ({ field, allFields }: Props) => {
  return (
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
          <EditFieldSection>
            <FormRow
              title={<h3>Path</h3>}
              description="Select the field you want your alias to point to."
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
                  options={getSuggestedFields(field, allFields)}
                  selectedOptions={pathField.value as AliasOption[]}
                  onChange={value => pathField.setValue(value)}
                  isClearable={false}
                />
              </EuiFormRow>
            </FormRow>
          </EditFieldSection>
        );
      }}
    </UseField>
  );
};
