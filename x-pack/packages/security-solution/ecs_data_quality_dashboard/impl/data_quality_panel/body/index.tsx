/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { DataQualityDetails } from './data_quality_details';
import { DataQualitySummary } from '../data_quality_summary';

const BodyComponent: React.FC = () => {
  return (
    <EuiFlexGroup data-test-subj="body" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DataQualitySummary />
        <EuiSpacer size="l" />
      </EuiFlexItem>

      <EuiFlexItem>
        <DataQualityDetails />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Body = React.memo(BodyComponent);
