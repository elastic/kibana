/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { NormalizedField } from '../../../../types';
import { DynamicParameter, EnabledParameter, SubobjectsParameter } from '../../field_parameters';
import { BasicParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

export const ObjectType = ({ field }: Props) => {
  return (
    <BasicParametersSection>
      <DynamicParameter
        defaultToggleValue={field.source.dynamic === true || field.source.dynamic === undefined}
      />

      <EnabledParameter />

      <SubobjectsParameter />
    </BasicParametersSection>
  );
};
