/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { TableIcon } from '../../../../../../../components/package_icon';
import type { PanelPackage } from '../types';

export const PackagePanelTitle: React.FunctionComponent<{
  installedPackage: PanelPackage;
  /** Shown after the package title, e.g. what the panel lists. */
  subtitle?: string;
}> = ({ installedPackage, subtitle }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <TableIcon
        size="m"
        icons={installedPackage.icons}
        packageName={installedPackage.name}
        version={installedPackage.version}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{installedPackage.title}</EuiText>
    </EuiFlexItem>
    {subtitle ? (
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" data-test-subj="packagePanelSubtitle">
          · {subtitle}
        </EuiText>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);
