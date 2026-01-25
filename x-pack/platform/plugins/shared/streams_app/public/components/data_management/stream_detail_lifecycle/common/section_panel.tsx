/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import React from 'react';

interface SectionPanelProps {
  topCard: React.ReactNode;
  bottomCard: React.ReactNode;
  children: React.ReactNode;
}

export const SectionPanel = ({ topCard, bottomCard, children }: SectionPanelProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      grow={false}
      paddingSize="none"
      css={{ minHeight: '320px' }}
    >
      <EuiFlexGroup gutterSize="none" css={{ minHeight: '320px' }}>
        <EuiFlexItem grow={2}>
          <EuiFlexGroup gutterSize="none" direction="column" css={{ height: '100%' }}>
            <EuiFlexItem grow={1} css={{ minHeight: '160px' }}>
              {topCard}
            </EuiFlexItem>
            <EuiFlexItem grow={1} css={{ borderTop: euiTheme.border.thin, minHeight: '160px' }}>
              {bottomCard}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={5} css={{ minHeight: '320px' }}>
          <EuiFlexGroup direction="column" css={{ height: '100%' }}>
            <EuiFlexItem grow>{children}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
