/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiProgress, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React from 'react';
import styled from 'styled-components';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { useUiSetting$ } from '../../../lib/kibana';

const ProgressContainer = styled.div`
  width: 100px;
`;

export const StatValue = React.memo<{
  count: number;
  isLoading: boolean;
  isGroupStat: boolean;
  max: number;
}>(({ count, isGroupStat, isLoading, max }) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  return (
    <>
      {isLoading ? (
        <EuiLoadingSpinner data-test-subj="stat-value-loading-spinner" size="m" />
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText color={isGroupStat ? 'default' : 'subdued'} size={isGroupStat ? 'm' : 's'}>
              {numeral(count).format(defaultNumberFormat)}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <ProgressContainer>
              <EuiProgress
                color={isGroupStat ? 'primary' : 'subdued'}
                max={max}
                size="m"
                value={count}
              />
            </ProgressContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
});

StatValue.displayName = 'StatValue';
