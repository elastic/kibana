/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFieldText,
  EuiButtonEmpty
} from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';

type FieldKeys = 'fieldName' | 'value';
export type Field = {
  [key in FieldKeys]: string;
};

const DEFAULT_OPTION = {
  value: 'DEFAULT',
  text: i18n.translate(
    'xpack.apm.settings.customizeUI.customActions.flyOut.fields.label',
    {
      defaultMessage: 'Select fields...'
    }
  )
};

const emptyField = { fieldName: '', value: '' };

const fieldsOptions = [
  DEFAULT_OPTION,
  { value: 'service.name', text: 'service.name' },
  { value: 'service.environment', text: 'service.environment' },
  { value: 'transaction.type', text: 'transaction.type' },
  { value: 'transaction.name', text: 'transaction.name' }
];

export const FieldsSection = ({
  onFieldsChange
}: {
  onFieldsChange: (fields: Field[]) => void;
}) => {
  const [fields, setFields] = useState([emptyField] as Field[]);

  const onChangeField = (key: FieldKeys, value: string, idx: number) => {
    const copyOfFields = [...fields];
    copyOfFields[idx][key] = value;
    setFields(copyOfFields);
  };

  const onRemoveField = (idx: number) => {
    const copyOfFields = [...fields];
    copyOfFields.splice(idx, 1);
    // When empty, means that it was the last field that got removed,
    // so instead on showing empty list, will add a new empty field.
    if (isEmpty(copyOfFields)) {
      copyOfFields.push(emptyField);
    }
    setFields(copyOfFields);
  };

  useEffect(() => {
    // Sync parent state everytime a change happens in the fields.
    onFieldsChange(fields);
  }, [fields, onFieldsChange]);

  return (
    <>
      {fields.map((field, idx) => {
        const fieldId = `field-${idx}`;
        return (
          <EuiFlexGroup key={fieldId} gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiSelect
                id={fieldId}
                fullWidth
                options={fieldsOptions.filter(option => {
                  const indexUsedField = fields.findIndex(
                    _field => _field.fieldName === option.value
                  );
                  return indexUsedField === -1 || idx === indexUsedField;
                })}
                value={field.fieldName}
                onChange={e => onChangeField('fieldName', e.target.value, idx)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyOut.fields.value',
                  { defaultMessage: 'Value' }
                )}
                onChange={e => onChangeField('value', e.target.value, idx)}
                value={field.value}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="trash"
                onClick={() => onRemoveField(idx)}
                disabled={!field.fieldName && fields.length === 1}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={() => {
          setFields(currentFields => [...currentFields, emptyField]);
        }}
        disabled={fields.length === fieldsOptions.length - 1}
      >
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customActions.flyout.addAnotherField',
          {
            defaultMessage: 'Add another field'
          }
        )}
      </EuiButtonEmpty>
    </>
  );
};
