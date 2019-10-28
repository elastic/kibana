/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EditFieldFormRow } from '../fields/edit_field';
import { getFieldConfig } from '../../../lib';
import { UseField, Field } from '../../../shared_imports';

interface Props {
  defaultToggleValue: boolean;
}

export const NullValueParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={<h3>Set null value</h3>}
    description="This is description text."
    toggleDefaultValue={defaultToggleValue}
  >
    <UseField path="null_value" config={getFieldConfig('null_value')} component={Field} />
  </EditFieldFormRow>
);
