/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Tone, ViewSpec } from '@kbn/adaptive-ui';
import {
  DescriptionList,
  DescriptionListItem,
  Stat,
  StatGroup,
  TimeSeries,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';

/**
 * Mirror of the `security.entity_risk_score_history` attachment data. The
 * canonical type lives in `@kbn/security-solution-plugin`; only the presentational
 * subset is mirrored here.
 */
export interface EntityRiskScoreEntry {
  timestamp: string;
  score: number;
}

export interface EntityRiskScoreHistoryData {
  entity_name: string;
  entity_type?: string;
  interval?: string;
  entries: EntityRiskScoreEntry[];
}

// Buckets mirror Security's risk levels (`Unknown < 20 ≤ Low < 40 ≤ Moderate <
// 70 ≤ High < 90 ≤ Critical`).
const riskLevel = (score: number): { label: string; tone: Tone } => {
  if (score >= 90) {
    return { label: 'Critical', tone: 'danger' };
  }
  if (score >= 70) {
    return { label: 'High', tone: 'risk' };
  }
  if (score >= 40) {
    return { label: 'Moderate', tone: 'warning' };
  }
  if (score >= 20) {
    return { label: 'Low', tone: 'success' };
  }
  return { label: 'Unknown', tone: 'neutral' };
};

/**
 * Alternate rendering for the `security.entity_risk_score_history` attachment: the
 * latest score/level as a stat row, the trend as a `timeSeries`, and the observed
 * range/interval as a field list.
 */
export const toEntityRiskScoreHistoryViewSpec = ({
  entity_name: entityName,
  entity_type: entityType,
  interval,
  entries,
}: EntityRiskScoreHistoryData): ViewSpec => {
  const latest = entries.length > 0 ? entries[entries.length - 1] : undefined;
  const level = riskLevel(latest?.score ?? 0);

  return toViewSpec(
    <View title={`${entityName} risk history`} subtitle="Entity risk score">
      <StatGroup label="Latest">
        <Stat label="Risk score" value={String(latest?.score ?? 0)} tone={level.tone} />
        <Stat label="Risk level" value={level.label} tone={level.tone} />
      </StatGroup>
      {entries.length > 0 && (
        <TimeSeries
          label="Risk score history"
          variant="area"
          series={[
            {
              label: entityName,
              tone: level.tone,
              values: entries.map((entry) => ({ time: entry.timestamp, value: entry.score })),
            },
          ]}
        />
      )}
      <DescriptionList label="History" layout="inline">
        <DescriptionListItem
          title="Entity"
          description={entityType ? `${entityName} (${entityType})` : entityName}
        />
        {entries.length > 0 && (
          <DescriptionListItem
            title="Range"
            description={`${entries[0].timestamp} → ${entries[entries.length - 1].timestamp}`}
          />
        )}
        {interval && <DescriptionListItem title="Interval" description={interval} />}
      </DescriptionList>
    </View>
  );
};

export const sampleEntityRiskScoreHistory: EntityRiskScoreHistoryData = {
  entity_name: 'finance-db-01',
  entity_type: 'host',
  interval: '1d',
  entries: [
    { timestamp: '2026-08-13T00:00:00.000Z', score: 41 },
    { timestamp: '2026-08-14T00:00:00.000Z', score: 48 },
    { timestamp: '2026-08-15T00:00:00.000Z', score: 55 },
    { timestamp: '2026-08-16T00:00:00.000Z', score: 63 },
    { timestamp: '2026-08-17T00:00:00.000Z', score: 78 },
    { timestamp: '2026-08-18T00:00:00.000Z', score: 89 },
    { timestamp: '2026-08-19T00:00:00.000Z', score: 96 },
  ],
};
