/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { PathParameter } from '../../field_parameters';
import { NormalizedField, NormalizedFields } from '../../../../types';
import { FieldDescriptionSection, BasicParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
  isMultiField: boolean;
}

export const AliasType = ({ field, allFields, isMultiField }: Props) => {
  return (
    <>
      <FieldDescriptionSection isMultiField={isMultiField} />

      <BasicParametersSection>
        <PathParameter field={field} allFields={allFields} />
      </BasicParametersSection>
    </>
  );
};
