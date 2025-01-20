/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer } from '@elastic/eui';

export const EventLogStat = ({
  title,
  tooltip,
  children,
}: {
  title: string;
  tooltip: string;
  children?: JSX.Element;
}) => {
  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <b>{title}</b>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltip} position="top" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {children}
    </EuiPanel>
  );
};
