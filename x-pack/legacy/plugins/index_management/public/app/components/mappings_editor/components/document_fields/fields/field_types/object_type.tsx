/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { BasicParametersSection } from '../edit_field';

import { DynamicParameter, EnabledParameter } from '../../field_parameters';

export const ObjectType = () => {
  return (
    <>
      <BasicParametersSection>
        <DynamicParameter />

        <EnabledParameter />
      </BasicParametersSection>
    </>
  );
};
