/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiRange } from '@elastic/eui';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, FormDataProvider } from '../../../../shared_imports';
import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

export const AliasType = ({ field }: Props) => {
  return (
    <EditFieldSection>
      <EditFieldFormRow>
        <div>ALIAS</div>
      </EditFieldFormRow>
    </EditFieldSection>
  );
};
