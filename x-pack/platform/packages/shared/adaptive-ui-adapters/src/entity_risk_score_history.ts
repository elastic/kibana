/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { descriptionList, statGroup, timeSeries, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, Tone, ViewSpec } from '@kbn/adaptive-ui';

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

  const body: BodyNode[] = [
    statGroup({
      label: 'Latest',
      stats: [
        { label: 'Risk score', value: String(latest?.score ?? 0), tone: level.tone },
        { label: 'Risk level', value: level.label, tone: level.tone },
      ],
    }),
  ];

  if (entries.length > 0) {
    body.push(
      timeSeries({
        label: 'Risk score history',
        variant: 'area',
        series: [
          {
            label: entityName,
            tone: level.tone,
            values: entries.map((entry) => ({ time: entry.timestamp, value: entry.score })),
          },
        ],
      })
    );
  }

  const details: Array<{ title: string; description: string }> = [
    { title: 'Entity', description: entityType ? `${entityName} (${entityType})` : entityName },
  ];
  if (entries.length > 0) {
    details.push({
      title: 'Range',
      description: `${entries[0].timestamp} → ${entries[entries.length - 1].timestamp}`,
    });
  }
  if (interval) {
    details.push({ title: 'Interval', description: interval });
  }
  body.push(descriptionList({ label: 'History', layout: 'inline', items: details }));

  return view({ title: `${entityName} risk history`, subtitle: 'Entity risk score', body });
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
