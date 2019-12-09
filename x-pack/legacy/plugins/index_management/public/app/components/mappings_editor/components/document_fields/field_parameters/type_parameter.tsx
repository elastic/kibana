/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiComboBox, EuiText, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getFieldConfig, filterTypesForMultiField } from '../../../lib';
import { UseField } from '../../../shared_imports';
import { ComboBoxOption } from '../../../types';
import { FIELD_TYPES_OPTIONS } from '../../../constants';

interface Props {
  onTypeChange: (nextType: ComboBoxOption[]) => void;
  isMultiField?: boolean | null;
  docLink?: string;
}

export const TypeParameter = ({ onTypeChange, isMultiField, docLink }: Props) => (
  <UseField path="type" config={getFieldConfig('type')}>
    {typeField => {
      const error = typeField.getErrorsMessages();
      const isInvalid = error ? Boolean(error.length) : false;

      return (
        <EuiFormRow
          label={typeField.label}
          error={error}
          isInvalid={isInvalid}
          labelAppend={
            docLink ? (
              <EuiText size="xs">
                <EuiLink href={docLink} target="_blank">
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.typeField.documentationLinkLabel', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              </EuiText>
            ) : null
          }
        >
          <EuiComboBox
            placeholder={i18n.translate('xpack.idxMgmt.mappingsEditor.typeField.placeholderLabel', {
              defaultMessage: 'Select a type',
            })}
            singleSelection={{ asPlainText: true }}
            options={
              isMultiField ? filterTypesForMultiField(FIELD_TYPES_OPTIONS) : FIELD_TYPES_OPTIONS
            }
            selectedOptions={typeField.value as ComboBoxOption[]}
            onChange={onTypeChange}
            isClearable={false}
          />
        </EuiFormRow>
      );
    }}
  </UseField>
);
