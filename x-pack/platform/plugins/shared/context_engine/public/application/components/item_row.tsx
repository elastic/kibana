/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';

interface ItemRowProps {
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  'data-test-subj'?: string;
}

export const ItemRow = ({
  label,
  icon,
  badge,
  children,
  actions,
  'data-test-subj': dataTestSubj,
}: ItemRowProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiText size="s" className="eui-textTruncate">
          {children ?? label}
        </EuiText>
      </EuiFlexItem>
      {badge ? <EuiFlexItem grow={false}>{badge}</EuiFlexItem> : null}
      {actions ? <EuiFlexItem grow={false}>{actions}</EuiFlexItem> : null}
    </EuiFlexGroup>
  </EuiPanel>
);
