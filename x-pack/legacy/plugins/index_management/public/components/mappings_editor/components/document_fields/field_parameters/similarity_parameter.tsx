/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { EditFieldFormRow } from '../fields/edit_field';
import { PARAMETERS_OPTIONS } from '../../../constants';
import { getFieldConfig } from '../../../lib';
import { UseField, Field } from '../../../shared_imports';

interface Props {
  defaultToggleValue: boolean;
}

export const SimilarityParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={<h3>Set similarity</h3>}
    description="This is description text."
    direction="column"
    toggleDefaultValue={defaultToggleValue}
  >
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <UseField
          path="similarity"
          config={getFieldConfig('similarity')}
          component={Field}
          componentProps={{
            euiFieldProps: {
              options: PARAMETERS_OPTIONS.similarity,
              style: { maxWidth: 300 },
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          This is description text.
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EditFieldFormRow>
);
