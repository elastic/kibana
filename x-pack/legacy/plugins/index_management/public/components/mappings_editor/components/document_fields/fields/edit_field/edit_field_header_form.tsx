/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  TextField,
  SelectField,
  UseField,
  FieldConfig,
  ValidationFunc,
} from '../../../../shared_imports';
import { ParameterName } from '../../../../types';
import { FIELD_TYPES_OPTIONS, PARAMETERS_DEFINITION } from '../../../../constants';

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

interface Props {
  uniqueNameValidator: ValidationFunc;
}

export const EditFieldHeaderForm = ({ uniqueNameValidator }: Props) => {
  const { validations, ...rest } = getFieldConfig('name');
  const nameConfig: FieldConfig = {
    ...rest,
    validations: [
      ...validations!,
      {
        validator: uniqueNameValidator,
      },
    ],
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField path="name" config={nameConfig} component={TextField} />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="type"
          config={getFieldConfig('type')}
          component={SelectField}
          componentProps={{
            euiFieldProps: {
              options: FIELD_TYPES_OPTIONS,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
