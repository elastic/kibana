/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { getFieldConfig } from '../../../lib';
import { UseField, Field } from '../../../shared_imports';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  defaultToggleValue: boolean;
  description?: string;
  children?: React.ReactNode;
}

export const NullValueParameter = ({ defaultToggleValue, description, children }: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.nullValueFieldTitle', {
      defaultMessage: 'Set null value',
    })}
    description={
      description
        ? description
        : i18n.translate('xpack.idxMgmt.mappingsEditor.nullValueFieldDescription', {
            defaultMessage:
              'Replace explicit null values with the specified value so that it can be indexed and searched.',
          })
    }
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.nullValueDocLinkText', {
        defaultMessage: 'Null value documentation',
      }),
      href: documentationService.getNullValueLink(),
    }}
    defaultToggleValue={defaultToggleValue}
  >
    {children ? (
      children
    ) : (
      <UseField path="null_value" config={getFieldConfig('null_value')} component={Field} />
    )}
  </EditFieldFormRow>
);
