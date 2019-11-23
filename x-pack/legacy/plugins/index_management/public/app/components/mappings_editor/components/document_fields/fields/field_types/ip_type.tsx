/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';

import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
} from '../../field_parameters';
import { EditFieldSection, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'null_value': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
}

export const IpType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <StoreParameter />
        <IndexParameter hasIndexOptions={false} />
        <DocValuesParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* null_value */}
          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
          />

          {/* boost */}
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
