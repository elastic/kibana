/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

interface LockedSectionPanelProps {
  title: React.ReactNode;
  description: React.ReactNode;
  ariaLabel: string;
  'data-test-subj'?: string;
}

/** Placeholder for a section that unlocks once an earlier one has content. */
export const LockedSectionPanel = ({
  title,
  description,
  ariaLabel,
  'data-test-subj': dataTestSubj,
}: LockedSectionPanelProps) => (
  <EuiPanel
    hasBorder
    paddingSize="l"
    color="subdued"
    aria-label={ariaLabel}
    data-test-subj={dataTestSubj}
  >
    <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="lock" color="subdued" size="l" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
