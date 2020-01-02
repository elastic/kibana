/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FieldHook, NumericField } from '../../../shared_imports';

interface Props {
  min: FieldHook;
  max: FieldHook;
}

export const FielddataFrequencyFilterAbsolute = ({ min, max }: Props) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <NumericField field={min} />
      </EuiFlexItem>
      <EuiFlexItem>
        <NumericField field={max} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
