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
import { SelectOption } from '../../../types';
import { UseField, Field } from '../../../shared_imports';

interface Props {
  indexOptions?: SelectOption[];
}

export const IndexParameter = (
  { indexOptions }: Props = { indexOptions: PARAMETERS_OPTIONS.index_options }
) => (
  <EditFieldFormRow
    title={<h3>Searchable</h3>}
    description="This is description text."
    formFieldPath="index"
    direction="column"
  >
    {/* index_options */}
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <UseField
          path="index_options"
          config={getFieldConfig('index_options')}
          component={Field}
          componentProps={{
            euiFieldProps: {
              options: indexOptions,
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
