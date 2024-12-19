/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { UseField, Field, CheckBoxField } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { BasicParametersSection } from '../edit_field';

export const PassthroughType = () => {
  return (
    <BasicParametersSection>
      <UseField path="priority" config={getFieldConfig('priority')} component={Field} />
      <UseField
        path="dynamic"
        config={getFieldConfig('dynamic_passthrough')}
        component={CheckBoxField}
      />
    </BasicParametersSection>
  );
};
