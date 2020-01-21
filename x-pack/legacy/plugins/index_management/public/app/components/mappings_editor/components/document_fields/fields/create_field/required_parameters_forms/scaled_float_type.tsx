/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { FormRow, UseField, Field } from '../../../../../shared_imports';
import { getFieldConfig } from '../../../../../lib';
import { PARAMETERS_DEFINITION } from '../../../../../constants';

export const ScaledFloatTypeRequiredParameters = () => {
  return (
    <FormRow
      title={<h3>{PARAMETERS_DEFINITION.scaling_factor.title}</h3>}
      description={PARAMETERS_DEFINITION.scaling_factor.description}
      idAria="mappingsEditorScalingFactorParameter"
    >
      <UseField path="scaling_factor" config={getFieldConfig('scaling_factor')} component={Field} />
    </FormRow>
  );
};
