/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiLoadingChart } from '@elastic/eui';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export const ChartsLoading = ({
  'data-test-subj': dataTestSubj,
}: {
  'data-test-subj'?: string;
}) => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  // returns 2 loading icons for the two charts
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      data-test-subj={getTestId('charts-loading')}
    >
      {[...Array(2)].map((i) => (
        <EuiFlexItem key={i}>
          <EuiPanel paddingSize="xl" hasShadow={false} hasBorder={false}>
            <EuiLoadingChart size="l" />
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

ChartsLoading.displayName = 'ChartsLoading';
