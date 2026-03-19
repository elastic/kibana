/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';

interface ComplianceScoreGaugeProps {
  score: number;
  passed: number;
  failed: number;
  notApplicable: number;
}

export const ComplianceScoreGauge: React.FC<ComplianceScoreGaugeProps> = ({
  score,
  passed,
  failed,
  notApplicable,
}) => {
  const total = passed + failed + notApplicable;
  const color = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiStat
            title={`${score}%`}
            description="Compliance Score"
            titleColor={color}
            titleSize="l"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiProgress value={score} max={100} color={color} size="l" label="Posture score" />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s">
                <EuiIcon type="checkInCircleFilled" color="success" aria-hidden="true" /> {passed}{' '}
                passed
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <EuiIcon type="crossInCircleFilled" color="danger" aria-hidden="true" /> {failed}{' '}
                failed
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {total} total findings
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
