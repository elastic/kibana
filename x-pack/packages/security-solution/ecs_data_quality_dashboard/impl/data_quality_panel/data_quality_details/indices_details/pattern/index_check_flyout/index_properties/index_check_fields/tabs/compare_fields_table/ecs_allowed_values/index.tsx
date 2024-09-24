/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { EMPTY_PLACEHOLDER } from '../helpers';
import { CodeSuccess } from '../../../../../../../../../styles';
import type { AllowedValue } from '../../../../../../../../../types';

interface Props {
  allowedValues: AllowedValue[] | undefined;
}

const EcsAllowedValuesComponent: React.FC<Props> = ({ allowedValues }) =>
  allowedValues == null ? (
    <EuiCode data-test-subj="ecsAllowedValuesEmpty">{EMPTY_PLACEHOLDER}</EuiCode>
  ) : (
    <EuiFlexGroup data-test-subj="ecsAllowedValues" direction="row" wrap={true} gutterSize="xs">
      {allowedValues.map((x, i) => (
        <EuiFlexItem grow={false} key={`${x.name}_${i}`}>
          <CodeSuccess>{x.name}</CodeSuccess>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

EcsAllowedValuesComponent.displayName = 'EcsAllowedValuesComponent';

export const EcsAllowedValues = React.memo(EcsAllowedValuesComponent);
