/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface DatasetSplitBadgesProps {
  splits: Array<{
    name: string;
    count: number;
  }>;
}

const SPLIT_COLORS: Record<string, string> = {
  train: 'primary',
  validation: 'warning',
  test: 'success',
  holdout: 'accent',
};

export const DatasetSplitBadges: React.FC<DatasetSplitBadgesProps> = ({ splits }) => {
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {splits.map((split) => (
        <EuiFlexItem key={split.name} grow={false}>
          <EuiBadge color={SPLIT_COLORS[split.name] ?? 'hollow'}>
            {split.name} ({split.count})
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
