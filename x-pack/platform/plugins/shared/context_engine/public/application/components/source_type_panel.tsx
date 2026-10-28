/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';

interface SourceTypePanelProps {
  title: ReactNode;
  badgeCount: number;
  children: ReactNode;
  'data-test-subj'?: string;
}

/**
 * A bordered panel grouping sources of a single type (e.g. Elasticsearch data, Connectors).
 */
export const SourceTypePanel = ({
  title,
  badgeCount,
  children,
  'data-test-subj': dataTestSubj,
}: SourceTypePanelProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge data-test-subj="contextSourceTypePanelBadge">
          {badgeCount}
        </EuiNotificationBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    {children}
  </EuiPanel>
);
