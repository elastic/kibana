/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { getFieldConfig } from '../../../lib';
import { UseField, RangeField } from '../../../shared_imports';
import { EditFieldFormRow } from '../fields/edit_field';
import { documentationService } from '../../../../../services/documentation';

interface Props {
  defaultToggleValue: boolean;
}

export const BoostParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.boostFieldTitle', {
      defaultMessage: 'Set boost level',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.boostFieldDescription', {
      defaultMessage:
        'Boost individual fields at query time so it can count more toward the relevance score.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.boostDocLinkText', {
        defaultMessage: 'Boost documentation',
      }),
      href: documentationService.getBoostLink(),
    }}
    defaultToggleValue={defaultToggleValue}
  >
    {/* Boost level */}
    <UseField
      path="boost"
      config={getFieldConfig('boost')}
      component={RangeField}
      componentProps={{
        euiFieldProps: {
          min: 1,
          max: 20,
          showInput: true,
          fullWidth: true,
        },
      }}
    />
  </EditFieldFormRow>
);
