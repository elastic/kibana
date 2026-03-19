/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiBadge,
  EuiIcon,
  EuiProgress,
} from '@elastic/eui';
import type { ComplianceBenchmarkInfo } from '../../../common/compliance';

interface Props {
  benchmark: ComplianceBenchmarkInfo;
  score?: number;
  isSelected: boolean;
  onClick: () => void;
}

const PLATFORM_ICON: Record<string, string> = {
  darwin: 'logoApple',
  windows: 'logoWindows',
  linux: 'logoLinux',
};

export const BenchmarkCard: React.FC<Props> = ({ benchmark, score, isSelected, onClick }) => {
  const color =
    score != null && score >= 80 ? 'success' : score != null && score >= 60 ? 'warning' : 'danger';

  const selectable = useMemo(() => ({ onClick, isSelected }), [onClick, isSelected]);

  return (
    <EuiCard
      title={benchmark.name}
      description={`${benchmark.version} · ${benchmark.platforms.length} platforms`}
      hasBorder
      selectable={selectable}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {benchmark.platforms.map((p) => (
          <EuiFlexItem grow={false} key={p}>
            <EuiIcon type={PLATFORM_ICON[p] ?? 'compute'} size="l" />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {score != null && (
        <EuiProgress value={score} max={100} color={color} size="m" label={`${score}%`} />
      )}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiStat title={benchmark.enabled_rules} description="Enabled" titleSize="xs" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={benchmark.total_rules} description="Total" titleSize="xs" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiBadge>{benchmark.version}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
};
