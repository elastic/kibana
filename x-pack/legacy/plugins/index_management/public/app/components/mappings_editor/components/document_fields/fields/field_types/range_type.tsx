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
  BoostParameter,
  CoerceParameter,
} from '../../field_parameters';
import { BasicParametersSection, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  return field.boost !== undefined && field.boost !== getFieldConfig('boost').defaultValue;
};

interface Props {
  field: NormalizedField;
}

export const RangeType = ({ field }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter hasIndexOptions={false} />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <CoerceParameter />

        <StoreParameter />

        <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
      </AdvancedParametersSection>
    </>
  );
};
