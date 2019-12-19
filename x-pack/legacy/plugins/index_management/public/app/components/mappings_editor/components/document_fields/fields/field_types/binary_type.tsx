/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { StoreParameter, DocValuesParameter } from '../../field_parameters';
import { AdvancedParametersSection } from '../edit_field';

export const BinaryType = () => {
  return (
    <AdvancedParametersSection hasBasicSettings={false}>
      <DocValuesParameter configPath="doc_values_binary" />
      <StoreParameter />
    </AdvancedParametersSection>
  );
};
