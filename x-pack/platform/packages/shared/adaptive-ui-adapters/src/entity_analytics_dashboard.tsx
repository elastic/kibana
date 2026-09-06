/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Tone, ViewSpec } from '@kbn/adaptive-ui';
import {
  Donut,
  Entity,
  EntityList,
  Stat,
  StatGroup,
  Table,
  Text,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';
import { severityTone, titleCase } from './shared';

/**
 * Mirror of the `security.entity_analytics_dashboard` attachment data. The
 * canonical type lives in `@kbn/security-solution-plugin`; platform cannot depend
 * on a solution plugin, so only the presentational subset is mirrored here.
 */
export interface EntityAnalyticsRiskLevelCount {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

export interface EntityAnalyticsEntity {
  name: string;
  type?: string;
  risk_score: number;
  risk_level?: string;
}

export interface EntityAnalyticsAnomaly {
  title: string;
  description?: string;
}

export interface EntityAnalyticsDashboardData {
  summary?: string;
  severity_count?: EntityAnalyticsRiskLevelCount;
  distribution?: Array<{ label: string; value: number }>;
  entities?: EntityAnalyticsEntity[];
  anomaly_highlights?: EntityAnalyticsAnomaly[];
}

const DISTRIBUTION_TONE: Record<string, Tone> = {
  critical: 'danger',
  high: 'risk',
  medium: 'warning',
  low: 'success',
};

const RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

const segmentsFromSeverityCount = (
  severityCount: EntityAnalyticsRiskLevelCount
): Array<{ label: string; value: number }> =>
  RISK_LEVELS.flatMap((label) => {
    const value = severityCount[label] ?? 0;
    return value > 0 ? [{ label, value }] : [];
  });

/**
 * Alternate rendering for the `security.entity_analytics_dashboard` attachment: a
 * risk-level stat row, a distribution `donut` (from `distribution` or
 * `severity_count`), a top-entities `table`, the prose summary, and an `entityList`
 * of anomaly highlights.
 */
export const toEntityAnalyticsDashboardViewSpec = ({
  summary,
  severity_count: severityCount,
  distribution,
  entities,
  anomaly_highlights: anomalyHighlights,
}: EntityAnalyticsDashboardData): ViewSpec => {
  const donutSegments =
    distribution && distribution.length > 0
      ? distribution
      : segmentsFromSeverityCount(severityCount ?? {});

  return toViewSpec(
    <View title="Entity analytics" subtitle="Risk overview">
      {severityCount && (
        <StatGroup label="Entities by risk level">
          <Stat label="Critical" value={String(severityCount.critical ?? 0)} tone="danger" />
          <Stat label="High" value={String(severityCount.high ?? 0)} tone="risk" />
          <Stat label="Medium" value={String(severityCount.medium ?? 0)} tone="warning" />
          <Stat label="Low" value={String(severityCount.low ?? 0)} tone="success" />
        </StatGroup>
      )}
      {donutSegments.length > 0 && (
        <Donut
          label="Risk distribution"
          segments={donutSegments.map((segment) => ({
            label: titleCase(segment.label),
            value: segment.value,
            tone: DISTRIBUTION_TONE[segment.label.toLowerCase()] ?? 'neutral',
          }))}
        />
      )}
      {entities && entities.length > 0 && (
        <Table
          label="Top risky entities"
          columns={[
            { id: 'entity', label: 'Entity' },
            { id: 'type', label: 'Type' },
            { id: 'score', label: 'Risk score' },
            { id: 'level', label: 'Level' },
          ]}
          rows={entities.map((entity) => ({
            entity: entity.name,
            type: entity.type ?? '—',
            score: String(entity.risk_score),
            level: {
              type: 'badge',
              label: titleCase(entity.risk_level ?? 'unknown'),
              tone: severityTone(entity.risk_level),
            },
          }))}
        />
      )}
      {summary && <Text body={summary} />}
      {anomalyHighlights && anomalyHighlights.length > 0 && (
        <EntityList label="Anomaly highlights">
          {anomalyHighlights.map((anomaly) => (
            <Entity key={anomaly.title} title={anomaly.title} body={anomaly.description} />
          ))}
        </EntityList>
      )}
    </View>
  );
};

export const sampleEntityAnalyticsDashboard: EntityAnalyticsDashboardData = {
  summary:
    'Risk is concentrated in the finance subnet: three hosts and two users crossed the critical threshold in the last 24 hours.',
  severity_count: { critical: 5, high: 12, medium: 34, low: 88 },
  entities: [
    { name: 'finance-db-01', type: 'host', risk_score: 96, risk_level: 'critical' },
    { name: 'a.wong', type: 'user', risk_score: 91, risk_level: 'critical' },
    { name: 'finance-web-03', type: 'host', risk_score: 74, risk_level: 'high' },
  ],
  anomaly_highlights: [
    {
      title: 'Unusual process on finance-db-01',
      description: 'Encoded PowerShell not seen on this host in the trailing 30 days.',
    },
    {
      title: 'Impossible travel for a.wong',
      description: 'Sign-ins from two regions 400ms apart.',
    },
  ],
};
