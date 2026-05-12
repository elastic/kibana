/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Gate {
  name: string;
  passed: boolean;
  explanation?: string;
}

interface DeploymentGateStatusProps {
  gates: Gate[];
}

const gateStatusTitle = i18n.translate('xpack.evals.deploymentGateStatus.title', {
  defaultMessage: 'Deployment gates',
});

const overallPassedLabel = i18n.translate('xpack.evals.deploymentGateStatus.passed', {
  defaultMessage: 'All gates passed',
});

const overallFailedLabel = i18n.translate('xpack.evals.deploymentGateStatus.failed', {
  defaultMessage: 'Gates failed',
});

export const DeploymentGateStatus: React.FC<DeploymentGateStatusProps> = ({ gates }) => {
  const allPassed = gates.every((gate) => gate.passed);

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>{gateStatusTitle}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={allPassed ? 'success' : 'danger'}>
            {allPassed ? overallPassedLabel : overallFailedLabel}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {gates.map((gate) => (
        <div key={gate.name}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={gate.passed ? 'success' : 'danger'}
                iconType={gate.passed ? 'check' : 'cross'}
              >
                {gate.name}
              </EuiBadge>
            </EuiFlexItem>
            {!gate.passed && gate.explanation && (
              <EuiFlexItem>
                <EuiText size="xs" color="danger">
                  {gate.explanation}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </div>
      ))}
    </EuiPanel>
  );
};
