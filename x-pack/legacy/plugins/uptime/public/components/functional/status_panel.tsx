/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { PingHistogram, Snapshot } from '../connected';

const STATUS_CHART_HEIGHT = '160px';

export const StatusPanel = ({}) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={2}>
        <Snapshot height={STATUS_CHART_HEIGHT} />
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        <PingHistogram height={STATUS_CHART_HEIGHT} isResponsive={true} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
