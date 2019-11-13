/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { UseField } from '../../../shared_imports';

interface Props {
  defaultToggleValue: boolean;
}

export const IgnoreMalformedParameter = ({ defaultToggleValue }: Props) => (
  <UseField path="ignore_malformed">
    {ignoreMalformedField => (
      <EditFieldFormRow
        title={
          <h3>
            {i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreMalformedFieldTitle', {
              defaultMessage: 'Reject malformed data',
            })}
          </h3>
        }
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.ignoredMalformedFieldDescription',
          {
            defaultMessage: 'Whether to ignore malformed numbers.',
          }
        )}
        toggleDefaultValue={defaultToggleValue}
      >
        {isOn => {
          // As we labeled the field "Reject malformed" instead of "Ignore..."
          // we invert the value.
          ignoreMalformedField.setValue(!isOn);
          return null;
        }}
      </EditFieldFormRow>
    )}
  </UseField>
);
