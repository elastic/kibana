/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { UseField, Field } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';

interface Props {
  defaultToggleValue: boolean;
}

export const LocaleParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.date.localeFieldTitle', {
      defaultMessage: 'Set locale',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.localeFieldDescription', {
      defaultMessage: 'The locale to use when parsing dates.',
    })}
    defaultToggleValue={defaultToggleValue}
  >
    <UseField path="locale" config={getFieldConfig('locale')} component={Field} />
  </EditFieldFormRow>
);
