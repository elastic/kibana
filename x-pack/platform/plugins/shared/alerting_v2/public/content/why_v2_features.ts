/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';

export interface WhyV2Highlight {
  id: string;
  icon: IconType;
  headline: string;
}

export type WhyV2SpotlightIllustration = 'rule_events' | 'dispatcher';

export interface WhyV2Spotlight {
  id: string;
  label: string;
  headline: string;
  illustration: WhyV2SpotlightIllustration;
  reversed?: boolean;
}

export interface WhyV2ComparisonRow {
  dimension: string;
  v1: string;
  v2: string;
}

/** Apple-style compact highlights — scannable at a glance. */
export const WHY_V2_HIGHLIGHTS: WhyV2Highlight[] = [
  {
    id: 'episodes',
    icon: 'timeline',
    headline: 'Append-only events. Operate on episodes.',
  },
  {
    id: 'workflows',
    icon: 'launch',
    headline: 'Policies route to Workflows, not one-shot connectors.',
  },
  {
    id: 'agent',
    icon: 'sparkles',
    headline: 'Agentic flows. Author, diagnose, and migrate rules.',
  },
];

/** Split hero sections with illustrations — Elastic SOAR / Apple product-page rhythm. */
export const WHY_V2_SPOTLIGHTS: WhyV2Spotlight[] = [
  {
    id: 'detect',
    label: 'Detect & investigate',
    headline: 'Every evaluation becomes queryable data.',
    illustration: 'rule_events',
  },
  {
    id: 'respond',
    label: 'Notify & automate',
    headline: 'Match, group, throttle, then act with intent.',
    illustration: 'dispatcher',
    reversed: true,
  },
];

export const WHY_V2_COMPARISON: WhyV2ComparisonRow[] = [
  {
    dimension: 'Query & storage',
    v1: 'Rule-type plugins decide what is stored; users cannot change it',
    v2: 'ES|QL: you choose what to KEEP in `data`',
  },
  {
    dimension: 'History',
    v1: 'Updated in place; only the latest snapshot',
    v2: 'Append-only rule events; one document per evaluation',
  },
  {
    dimension: 'Investigation',
    v1: 'Bespoke alert indices; complex RBAC',
    v2: 'Query in Discover with ES|QL like any data',
  },
  {
    dimension: 'Rule definition',
    v1: 'Plugin-registered types with custom executor code',
    v2: 'ES|QL-first; Discover, Builder, and Agent create paths',
  },
  {
    dimension: 'Agentic flows',
    v1: 'Manual configuration in rule-type UIs',
    v2: 'Conversational authoring, rule doctor, v1→v2 migration',
  },
  {
    dimension: 'Notification control',
    v1: 'Per-action frequency, flapping, mute, rule snooze',
    v2: 'Action policies with matchers, grouping, and throttling',
  },
  {
    dimension: 'Snooze scope',
    v1: 'Entire rule',
    v2: 'Per series (`group_hash`); detection keeps running',
  },
  {
    dimension: 'Episode operations',
    v1: 'Mute alerts; mark untracked',
    v2: 'Ack/unack and deactivate on episodes',
  },
  {
    dimension: 'Correlation',
    v1: 'Not possible',
    v2: 'Rules on rules: alert data is queryable',
  },
  {
    dimension: 'Actions',
    v1: 'Connectors (one-shot notifications)',
    v2: 'Workflows (multi-step automation)',
  },
  {
    dimension: 'Coexistence',
    v1: 'Current production alerting path',
    v2: 'Runs alongside v1; copy rules at your pace',
  },
];
