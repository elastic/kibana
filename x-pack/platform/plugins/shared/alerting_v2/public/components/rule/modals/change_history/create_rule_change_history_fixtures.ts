/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { ChangeHistoryDetail } from '@kbn/change-history-ui';
import { RULE_CHANGE_HISTORY_STORY_OBJECT_ID } from './constants';

/** Domain rule snapshot persisted as `object.snapshot` (API response minus SO OCC token). */
type RuleSnapshot = Omit<RuleResponse, 'version'>;
type RuleApiResponse = RuleResponse;

export interface CreateRuleChangeHistoryFixturesOptions {
  objectId?: string;
  name?: string;
  /** When true, returns no history rows. */
  empty?: boolean;
  /**
   * How many newest-first versions to keep after building the full sample timeline.
   * Ignored when `empty` is true.
   */
  versionCount?: 1 | 2 | 3 | 4;
}

const buildBaseSnapshot = ({
  objectId,
  name,
}: {
  objectId: string;
  name: string;
}): RuleSnapshot => ({
  id: objectId,
  kind: 'alert',
  enabled: true,
  metadata: {
    name,
    version: 1,
    description: 'Alert when destination weather is thunder and lightning.',
    tags: ['flights', 'weather'],
    owner: 'observability',
  },
  time_field: 'timestamp',
  schedule: { every: '1m', lookback: '5h' },
  query: {
    format: 'standalone',
    breach: {
      query:
        'FROM kibana_sample_data_flights | WHERE DestWeather LIKE "Thunder & Lightning" | STATS c = COUNT(*) BY Carrier | WHERE c > 1',
    },
  },
  created_by: 'admin',
  created_at: '2026-07-22T14:00:00.000Z',
  updated_by: 'admin',
  updated_at: '2026-07-22T14:00:00.000Z',
});

/**
 * Newest-first mock history for Storybook / local UI exploration.
 * Snapshots mirror domain `RuleResponse` minus the SO OCC `version` token.
 */
export const createRuleChangeHistoryFixtures = (
  options: CreateRuleChangeHistoryFixturesOptions = {}
): ChangeHistoryDetail[] => {
  if (options.empty) {
    return [];
  }

  const objectId = options.objectId ?? RULE_CHANGE_HISTORY_STORY_OBJECT_ID;
  const name = options.name ?? 'Bad Weather';
  const baseSnapshot = buildBaseSnapshot({ objectId, name });

  const v1: RuleSnapshot = { ...baseSnapshot };

  const v2: RuleSnapshot = {
    ...baseSnapshot,
    metadata: {
      ...baseSnapshot.metadata,
      version: 2,
      description: 'Alert when flights see thunder and lightning at destination.',
    },
    schedule: { every: '1m', lookback: '1h' },
    updated_at: '2026-07-25T09:15:00.000Z',
    updated_by: 'bailey',
  };

  const v3: RuleSnapshot = {
    ...v2,
    metadata: {
      ...v2.metadata,
      version: 3,
    },
    query: {
      format: 'standalone',
      breach: {
        query:
          'FROM kibana_sample_data_flights | WHERE DestWeather LIKE "Thunder & Lightning" | STATS c = COUNT(*) BY Carrier | WHERE c > 2',
      },
    },
    updated_at: '2026-07-30T16:42:00.000Z',
    updated_by: 'admin',
  };

  const v4: RuleSnapshot = {
    ...v3,
    metadata: {
      ...v3.metadata,
      version: 4,
    },
    enabled: false,
    updated_at: '2026-08-01T11:05:00.000Z',
    updated_by: 'bailey',
  };

  const allVersions: ChangeHistoryDetail[] = [
    {
      id: `${objectId}-evt-disable`,
      timestamp: v4.updated_at,
      actor: { name: 'bailey', profileId: 'user-bailey' },
      action: 'Disabled',
      isCurrent: true,
      metadata: { version: 4 },
      snapshot: v4,
      changes: { count: 1, summary: [{ label: 'Enabled', count: 1 }] },
    },
    {
      id: `${objectId}-evt-query`,
      timestamp: v3.updated_at,
      actor: { name: 'admin', profileId: 'user-admin' },
      action: 'Updated',
      comment: 'Raised breach threshold from 1 to 2',
      metadata: { version: 3 },
      snapshot: v3,
      changes: { count: 1, summary: [{ label: 'Query', count: 1 }] },
    },
    {
      id: `${objectId}-evt-lookback`,
      timestamp: v2.updated_at,
      actor: { name: 'bailey', profileId: 'user-bailey' },
      action: 'Updated',
      comment: 'Shortened lookback window',
      metadata: { version: 2 },
      snapshot: v2,
      changes: {
        count: 2,
        summary: [
          { label: 'Schedule', count: 1 },
          { label: 'Metadata', count: 1 },
        ],
      },
    },
    {
      id: `${objectId}-evt-create`,
      timestamp: v1.created_at,
      actor: { name: 'admin', profileId: 'user-admin' },
      action: 'Created',
      metadata: { version: 1 },
      snapshot: v1,
    },
  ];

  const versionCount = options.versionCount ?? 4;
  const trimmed = allVersions.slice(4 - versionCount);

  if (trimmed.length === 0) {
    return trimmed;
  }

  // Ensure the newest retained row is marked current and older ones are not.
  return trimmed.map((entry, index) => ({
    ...entry,
    isCurrent: index === 0,
  }));
};

/** Builds a list-row `RuleApiResponse` from the newest fixture snapshot. */
export const createRuleApiResponseFromHistoryFixtures = (
  options: CreateRuleChangeHistoryFixturesOptions = {}
): RuleApiResponse => {
  const history = createRuleChangeHistoryFixtures({
    ...options,
    empty: false,
    versionCount: options.versionCount ?? 1,
  });
  const latest = history[0]?.snapshot as RuleSnapshot;

  return {
    ...latest,
    version: 'WzEsMV0=',
  };
};
