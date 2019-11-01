/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField } from '../../../../types';
import { StoreParameter, DocValuesParameter } from '../../field_parameters';
import { EditFieldSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

export const BinaryType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <StoreParameter />
        <DocValuesParameter />
      </EditFieldSection>
    </>
  );
};
