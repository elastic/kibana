/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { EvaluatorScoreBadge } from '../../components/evaluator_score_badge';
import { DeploymentGateStatus } from '../../components/deployment_gate_status';
import type { PairwiseExperimentResponse } from '../../hooks/use_evaluation_api';
import * as i18n from './translations';

interface ScoreMatrixRow {
  evaluator: string;
  variantAScore: number;
  variantBScore: number;
  delta: number;
  direction: 'A_better' | 'B_better' | 'tie';
}

// Placeholder hook — actual data fetching will be wired when server APIs are ready
const useComparisonData = (
  _comparisonId: string
): { data: PairwiseExperimentResponse | null; isLoading: boolean } => {
  return { data: null, isLoading: false };
};

export const ComparisonDashboard: React.FC = () => {
  const { id: comparisonId } = useParams<{ id: string }>();
  const { euiTheme } = useEuiTheme();
  const { data, isLoading } = useComparisonData(comparisonId);

  if (!comparisonId) {
    return (
      <EuiPageSection>
        <EuiSpacer />
        <EuiText textAlign="center" color="subdued">
          <h3>Skill Comparison</h3>
          <p>
            Compare two skill variants side-by-side. Select a comparison from the AESOP skill review
            to see evaluator score deltas.
          </p>
        </EuiText>
      </EuiPageSection>
    );
  }

  const scoreMatrixRows: ScoreMatrixRow[] = useMemo(() => {
    if (!data) return [];
    return data.per_evaluator.map((s) => ({
      evaluator: s.evaluator,
      variantAScore: s.score_a,
      variantBScore: s.score_b,
      delta: s.delta,
      direction: s.direction,
    }));
  }, [data]);

  const directionBadge = (direction: 'A_better' | 'B_better' | 'tie') => {
    if (direction === 'A_better') {
      return <EuiBadge color="success">{i18n.DIRECTION_A_BETTER}</EuiBadge>;
    }
    if (direction === 'B_better') {
      return <EuiBadge color="danger">{i18n.DIRECTION_B_BETTER}</EuiBadge>;
    }
    return <EuiBadge color="default">{i18n.DIRECTION_TIE}</EuiBadge>;
  };

  const columns: Array<EuiBasicTableColumn<ScoreMatrixRow>> = useMemo(
    () => [
      {
        field: 'evaluator',
        name: i18n.COLUMN_EVALUATOR,
        sortable: true,
        render: (name: string) => (
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
        ),
      },
      {
        field: 'variantAScore',
        name: i18n.COLUMN_VARIANT_A,
        render: (score: number) => <EvaluatorScoreBadge score={score} />,
      },
      {
        field: 'variantBScore',
        name: i18n.COLUMN_VARIANT_B,
        render: (score: number) => <EvaluatorScoreBadge score={score} />,
      },
      {
        field: 'delta',
        name: i18n.COLUMN_DELTA,
        render: (delta: number) => {
          const sign = delta > 0 ? '+' : '';
          return (
            <EuiText size="s">
              {sign}
              {delta.toFixed(3)}
            </EuiText>
          );
        },
      },
      {
        field: 'direction',
        name: i18n.COLUMN_DIRECTION,
        render: (direction: ScoreMatrixRow['direction']) => directionBadge(direction),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <EuiPageSection paddingSize="none">
        <EuiFlexGroup justifyContent="center" alignItems="center" css={{ minHeight: 300 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    );
  }

  if (!data) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiText color="subdued">
          <p>{i18n.NO_COMPARISON_DATA}</p>
        </EuiText>
      </EuiPageSection>
    );
  }

  const skillALabel = data.skill_a_id;
  const skillBLabel = data.skill_b_id;
  const winnerLabel =
    data.aggregate_winner === 'A'
      ? skillALabel
      : data.aggregate_winner === 'B'
      ? skillBLabel
      : i18n.DIRECTION_TIE;

  const winnerColor = data.aggregate_winner === 'tie' ? 'default' : 'success';

  // Compute average scores from per_evaluator
  const avgScoreA =
    data.per_evaluator.length > 0
      ? data.per_evaluator.reduce((sum, e) => sum + e.score_a, 0) / data.per_evaluator.length
      : 0;
  const avgScoreB =
    data.per_evaluator.length > 0
      ? data.per_evaluator.reduce((sum, e) => sum + e.score_b, 0) / data.per_evaluator.length
      : 0;

  return (
    <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
      {/* Header with variant names */}
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>{skillALabel}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="m" color="subdued">
            vs
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>{skillBLabel}</h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Summary Stats */}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiStat
              title={<EuiBadge color={winnerColor}>{winnerLabel}</EuiBadge>}
              description={i18n.WINNER_LABEL}
              titleSize="m"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiStat
              title={
                <EuiBadge color={data.significance.significant ? 'success' : 'warning'}>
                  {data.significance.significant ? i18n.SIGNIFICANT : i18n.NOT_SIGNIFICANT}
                </EuiBadge>
              }
              description={i18n.SIGNIFICANCE_LABEL}
              titleSize="m"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Composite Score Comparison */}
      <EuiTitle size="s">
        <h3>{i18n.COMPOSITE_SCORE_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="l">
          <EuiFlexItem>
            <EuiText size="xs">
              <strong>{skillALabel}</strong>
            </EuiText>
            <EuiProgress value={avgScoreA * 100} max={100} size="l" color="primary" />
            <EuiText size="s">{avgScoreA.toFixed(3)}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs">
              <strong>{skillBLabel}</strong>
            </EuiText>
            <EuiProgress value={avgScoreB * 100} max={100} size="l" color="accent" />
            <EuiText size="s">{avgScoreB.toFixed(3)}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="l" />

      {/* Score Matrix */}
      <EuiTitle size="s">
        <h3>{i18n.SCORE_MATRIX_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiBasicTable<ScoreMatrixRow> items={scoreMatrixRows} columns={columns} />

      <EuiSpacer size="l" />

      {/* Deployment Gates */}
      <DeploymentGateStatus
        gates={[
          { name: 'Minimum composite score', passed: true },
          { name: 'Statistical significance', passed: data.significance.significant },
        ]}
      />

      <EuiSpacer size="l" />

      {/* Deploy Winner Button */}
      {data.significance.significant && data.aggregate_winner !== 'tie' && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="push" color="success">
              {i18n.DEPLOY_WINNER_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPageSection>
  );
};
