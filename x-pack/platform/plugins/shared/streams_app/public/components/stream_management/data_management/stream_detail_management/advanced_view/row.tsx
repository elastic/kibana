/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';

export function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="l">
      <EuiFlexItem grow={2}>{left}</EuiFlexItem>
      <EuiFlexItem grow={5}>{right}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function RowMetadata({ label, description }: { label: string; description: string }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiText size="m">
          <h4>{label}</h4>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
