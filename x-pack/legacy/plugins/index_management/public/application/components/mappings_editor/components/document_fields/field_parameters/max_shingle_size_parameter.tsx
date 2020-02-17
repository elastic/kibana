/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { getFieldConfig } from '../../../lib';
import { EditFieldFormRow } from '../fields/edit_field';
import { UseField, Field } from '../../../shared_imports';

interface Props {
  defaultToggleValue: boolean;
}

export const MaxShingleSizeParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.maxShingleSizeFieldTitle', {
      defaultMessage: 'Set max shingle size',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.maxShingleSizeFieldDescription', {
      defaultMessage:
        'The default is three shingle subfields. More subfields enables more specific queries, but increases index size.',
    })}
    defaultToggleValue={defaultToggleValue}
  >
    <UseField
      path="max_shingle_size"
      component={Field}
      config={getFieldConfig('max_shingle_size')}
      componentProps={{
        euiFieldProps: {
          options: [
            { value: 2, text: '2' },
            { value: 3, text: '3' },
            { value: 4, text: '4' },
          ],
        },
      }}
    />
  </EditFieldFormRow>
);
