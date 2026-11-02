/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import React from 'react';

interface PanelHeaderProps {
  iconType: IconType;
  title: React.ReactNode;
  description: React.ReactNode;
}

/** Icon, title, and one-line description heading each session memory panel. */
export const PanelHeader = ({ iconType, title, description }: PanelHeaderProps) => (
  <>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="l" color="primary" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
    <EuiText size="s" color="subdued">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
  </>
);
