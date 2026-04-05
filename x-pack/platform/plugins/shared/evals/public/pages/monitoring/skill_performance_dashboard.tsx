/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { useSkillMetrics, useReEvaluateSkill } from '../../hooks/use_monitoring_api';
import { SkillAlertsPanel } from './skill_alerts_panel';
import * as i18n from './translations';

export const SkillPerformanceDashboard: React.FC = () => {
  const { skillId } = useParams<{ skillId: string }>();
  const { euiTheme } = useEuiTheme();
  const reEvaluate = useReEvaluateSkill();

  const now = useMemo(() => new Date(), []);
  const from = useMemo(
    () => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    [now]
  );
  const to = useMemo(() => now.toISOString(), [now]);

  const { data: metrics, isLoading, error } = useSkillMetrics(skillId || '', from, to);

  if (!skillId) {
    return (
      <EuiPageSection>
        <EuiSpacer />
        <EuiText textAlign="center" color="subdued">
          <h3>Skill Performance Monitoring</h3>
          <p>
            Track skill quality over time with eval score trends, alerts, and regression detection.
            Select a skill from the AESOP tab to view its performance dashboard.
          </p>
        </EuiText>
      </EuiPageSection>
    );
  }

  if (isLoading) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>{i18n.LOADING_METRICS}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    );
  }

  if (error || !metrics) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiCallOut title={i18n.ERROR_LOADING_METRICS} color="danger" iconType="error">
          <p>{String(error)}</p>
        </EuiCallOut>
      </EuiPageSection>
    );
  }

  const sparklineData = metrics.usage.invocations_per_day.map((d) => d.count);
  const maxSparklineVal = Math.max(...sparklineData, 1);

  return (
    <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="m">
            <h2>
              {i18n.PAGE_TITLE}: {metrics.skill_name}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() =>
              reEvaluate.mutate({
                skillId,
                dataset_id: 'default',
                evaluators: ['accuracy'],
                connector_id: 'default',
              })
            }
            isLoading={reEvaluate.isLoading}
            iconType="refresh"
          >
            {i18n.REEVALUATE_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Usage Section */}
      <EuiPanel>
        <EuiTitle size="xs">
          <h3>{i18n.USAGE_SECTION_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiStat
              title={metrics.usage.total_invocations}
              description={i18n.TOTAL_INVOCATIONS}
              titleSize="m"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={metrics.usage.unique_agents}
              description={i18n.UNIQUE_AGENTS}
              titleSize="m"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={metrics.usage.unique_users}
              description={i18n.UNIQUE_USERS}
              titleSize="m"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiText size="xs" color="subdued">
              {i18n.INVOCATIONS_TREND}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" alignItems="flexEnd" responsive={false}>
              {sparklineData.map((count, idx) => (
                <EuiFlexItem key={idx} grow={false}>
                  <div
                    style={{
                      width: 8,
                      height: Math.max(4, (count / maxSparklineVal) * 40),
                      backgroundColor: euiTheme.colors.primary,
                      borderRadius: 2,
                    }}
                    title={`${metrics.usage.invocations_per_day[idx]?.date}: ${count}`}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Success Section */}
      <EuiPanel>
        <EuiTitle size="xs">
          <h3>{i18n.SUCCESS_SECTION_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiStat
              title={`${(metrics.success.success_rate * 100).toFixed(1)}%`}
              description={i18n.SUCCESS_RATE}
              titleSize="m"
              titleColor={metrics.success.success_rate >= 0.7 ? 'success' : 'danger'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={metrics.success.positive_feedback}
              description={i18n.POSITIVE_FEEDBACK}
              titleSize="m"
              titleColor="success"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={metrics.success.negative_feedback}
              description={i18n.NEGATIVE_FEEDBACK}
              titleSize="m"
              titleColor="danger"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={metrics.success.unknown_feedback}
              description={i18n.UNKNOWN_FEEDBACK}
              titleSize="m"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Quality Section */}
      <EuiPanel>
        <EuiTitle size="xs">
          <h3>{i18n.QUALITY_SECTION_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiStat
              title={metrics.quality.deployment_score.toFixed(2)}
              description={i18n.DEPLOYMENT_SCORE}
              titleSize="m"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={
                metrics.quality.current_score !== null
                  ? metrics.quality.current_score.toFixed(2)
                  : i18n.NA_VALUE
              }
              description={i18n.CURRENT_SCORE}
              titleSize="m"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={
                metrics.quality.score_delta !== null
                  ? `${
                      metrics.quality.score_delta >= 0 ? '+' : ''
                    }${metrics.quality.score_delta.toFixed(2)}`
                  : i18n.NA_VALUE
              }
              description={i18n.SCORE_DELTA}
              titleSize="m"
              titleColor={
                metrics.quality.score_delta !== null && metrics.quality.score_delta < 0
                  ? 'danger'
                  : 'success'
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.DRIFT_DETECTED}
            </EuiText>
            <EuiSpacer size="xs" />
            {metrics.quality.drift_detected ? (
              <EuiBadge color="danger">{i18n.DRIFT_DETECTED}</EuiBadge>
            ) : (
              <EuiBadge color="success">{i18n.NO_DRIFT}</EuiBadge>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.LAST_EVALUATED}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              {metrics.quality.last_evaluated_at
                ? new Date(metrics.quality.last_evaluated_at).toLocaleString()
                : i18n.NOT_EVALUATED}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Alerts Section */}
      <SkillAlertsPanel skillId={skillId} alerts={metrics.alerts} />
    </EuiPageSection>
  );
};
