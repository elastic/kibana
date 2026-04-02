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
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Dimension {
  name: string;
  score: number;
}

interface Gate {
  name: string;
  passed: boolean;
  explanation?: string;
}

interface CompositeScoreCardProps {
  score: number;
  dimensions: Dimension[];
  gates: Gate[];
}

const getLetterGrade = (score: number): string => {
  if (score >= 0.95) return 'A+';
  if (score >= 0.9) return 'A';
  if (score >= 0.85) return 'A-';
  if (score >= 0.8) return 'B+';
  if (score >= 0.75) return 'B';
  if (score >= 0.7) return 'B-';
  if (score >= 0.65) return 'C+';
  if (score >= 0.6) return 'C';
  if (score >= 0.55) return 'C-';
  if (score >= 0.5) return 'D';
  return 'F';
};

const getScoreColor = (score: number): 'success' | 'warning' | 'danger' => {
  if (score >= 0.8) return 'success';
  if (score >= 0.5) return 'warning';
  return 'danger';
};

const compositeScoreLabel = i18n.translate('xpack.evals.compositeScoreCard.score', {
  defaultMessage: 'Composite score',
});

const dimensionsLabel = i18n.translate('xpack.evals.compositeScoreCard.dimensions', {
  defaultMessage: 'Dimensions',
});

const gatesLabel = i18n.translate('xpack.evals.compositeScoreCard.gates', {
  defaultMessage: 'Gates',
});

const passedLabel = i18n.translate('xpack.evals.compositeScoreCard.passed', {
  defaultMessage: 'Passed',
});

const failedLabel = i18n.translate('xpack.evals.compositeScoreCard.failed', {
  defaultMessage: 'Failed',
});

export const CompositeScoreCard: React.FC<CompositeScoreCardProps> = ({
  score,
  dimensions,
  gates,
}) => {
  const allGatesPassed = gates.every((gate) => gate.passed);

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h3>{score.toFixed(2)}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={getScoreColor(score)}>{getLetterGrade(score)}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {compositeScoreLabel}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiText size="xs">
        <strong>{dimensionsLabel}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {dimensions.map((dimension) => (
        <div key={dimension.name}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
              <EuiText size="xs">{dimension.name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                value={dimension.score * 100}
                max={100}
                size="m"
                color={getScoreColor(dimension.score)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 40 }}>
              <EuiText size="xs">{dimension.score.toFixed(2)}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </div>
      ))}

      <EuiSpacer size="s" />

      <EuiText size="xs">
        <strong>{gatesLabel}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={allGatesPassed ? 'success' : 'danger'}>
            {allGatesPassed ? passedLabel : failedLabel}
          </EuiBadge>
        </EuiFlexItem>
        {gates
          .filter((gate) => !gate.passed)
          .map((gate) => (
            <EuiFlexItem key={gate.name} grow={false}>
              <EuiBadge color="danger">
                {gate.name}
                {gate.explanation ? `: ${gate.explanation}` : ''}
              </EuiBadge>
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
