/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { EMPTY_PLACEHOLDER } from '../helpers';
import { CodeSuccess } from '../../styles';
import type { AllowedValue } from '../../types';

const EcsAllowedValueFlexItem = styled(EuiFlexItem)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface Props {
  allowedValues: AllowedValue[] | undefined;
}

const EcsAllowedValuesComponent: React.FC<Props> = ({ allowedValues }) =>
  allowedValues == null ? (
    <EuiCode data-test-subj="ecsAllowedValuesEmpty">{EMPTY_PLACEHOLDER}</EuiCode>
  ) : (
    <EuiFlexGroup data-test-subj="ecsAllowedValues" direction="column" gutterSize="none">
      {allowedValues.map((x, i) => (
        <EcsAllowedValueFlexItem grow={false} key={`${x.name}_${i}`}>
          <CodeSuccess>{x.name}</CodeSuccess>
        </EcsAllowedValueFlexItem>
      ))}
    </EuiFlexGroup>
  );

EcsAllowedValuesComponent.displayName = 'EcsAllowedValuesComponent';

export const EcsAllowedValues = React.memo(EcsAllowedValuesComponent);
