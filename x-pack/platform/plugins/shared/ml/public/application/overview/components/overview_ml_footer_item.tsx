/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

interface OverviewFooterItemProps {
  title: string;
  description: string;
  docLink: string;
  callToAction: React.ReactNode;
}

export const OverviewFooterItem: FC<OverviewFooterItemProps> = ({
  title,
  description,
  docLink,
  callToAction,
}) => (
  <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{description}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiSpacer size="s" />
      {callToAction}
    </EuiFlexItem>
  </EuiFlexGroup>
);
