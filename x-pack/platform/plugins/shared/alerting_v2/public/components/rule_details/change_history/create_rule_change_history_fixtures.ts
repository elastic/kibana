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

const baseSnapshot = {
  id: RULE_CHANGE_HISTORY_STORY_OBJECT_ID,
  kind: 'alert' as const,
  enabled: true,
  metadata: {
    name: 'Bad Weather',
    version: 1,
    description: 'Alert when destination weather is thunder and lightning.',
    tags: ['flights', 'weather'],
    owner: 'observability',
  },
  time_field: 'timestamp',
  schedule: { every: '1m', lookback: '5h' },
  query: {
    format: 'standalone' as const,
    breach: {
      query:
        'FROM kibana_sample_data_flights | WHERE DestWeather LIKE "Thunder & Lightning" | STATS c = COUNT(*) BY Carrier | WHERE c > 1',
    },
  },
  createdBy: 'admin',
  createdAt: '2026-07-22T14:00:00.000Z',
  updatedBy: 'admin',
  updatedAt: '2026-07-22T14:00:00.000Z',
} satisfies RuleSnapshot;

/**
 * Newest-first mock history for Storybook / local UI exploration.
 * Snapshots mirror domain `RuleResponse` minus the SO OCC `version` token.
 */
export const createRuleChangeHistoryFixtures = (): ChangeHistoryDetail[] => {
  const v1: RuleSnapshot = { ...baseSnapshot };

  const v2: RuleSnapshot = {
    ...baseSnapshot,
    metadata: {
      ...baseSnapshot.metadata,
      version: 2,
      description: 'Alert when flights see thunder and lightning at destination.',
    },
    schedule: { every: '1m', lookback: '1h' },
    updatedAt: '2026-07-25T09:15:00.000Z',
    updatedBy: 'bailey',
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
    updatedAt: '2026-07-30T16:42:00.000Z',
    updatedBy: 'admin',
  };

  const v4: RuleSnapshot = {
    ...v3,
    metadata: {
      ...v3.metadata,
      version: 4,
    },
    enabled: false,
    updatedAt: '2026-08-01T11:05:00.000Z',
    updatedBy: 'bailey',
  };

  return [
    {
      id: 'evt-disable',
      timestamp: v4.updatedAt,
      actor: { name: 'bailey', profileId: 'user-bailey' },
      action: 'Disabled',
      isCurrent: true,
      metadata: { version: 4 },
      snapshot: v4,
      changes: { count: 1, summary: [{ label: 'Enabled', count: 1 }] },
    },
    {
      id: 'evt-query',
      timestamp: v3.updatedAt,
      actor: { name: 'admin', profileId: 'user-admin' },
      action: 'Updated',
      comment: 'Raised breach threshold from 1 to 2',
      metadata: { version: 3 },
      snapshot: v3,
      changes: { count: 1, summary: [{ label: 'Query', count: 1 }] },
    },
    {
      id: 'evt-lookback',
      timestamp: v2.updatedAt,
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
      id: 'evt-create',
      timestamp: v1.createdAt,
      actor: { name: 'admin', profileId: 'user-admin' },
      action: 'Created',
      metadata: { version: 1 },
      snapshot: v1,
    },
  ];
};
