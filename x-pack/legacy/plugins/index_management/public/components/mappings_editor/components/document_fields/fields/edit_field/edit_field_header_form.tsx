/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SelectField, UseField, FieldConfig } from '../../../../shared_imports';
import { ParameterName } from '../../../../types';
import { FIELD_TYPES_OPTIONS, PARAMETERS_DEFINITION } from '../../../../constants';
import { NameParameter } from '../../field_parameters';

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

export const EditFieldHeaderForm = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <NameParameter />
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
