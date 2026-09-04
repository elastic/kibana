/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartTypeReviewPromptContent } from '@kbn/agent-builder-visualizations-server';
import { dashboardRuleRegistry } from './dashboard_rule_registry';

/** Dashboard layout and composition instructions, shared by creation and updates. */
export const getDashboardDesignPromptContent = (): string =>
  ['## Dashboard Design', ...Object.values(dashboardRuleRegistry).map(({ design }) => design)].join(
    '\n'
  );

/** Dashboard-level visual review, without duplicating the skill's layout reference. */
export const getDashboardReviewTopicsContent = (): string =>
  [
    '## Dashboard Review',
    ...Object.entries(dashboardRuleRegistry).flatMap(([topic, { review }]) => [
      `### ${topic}`,
      ...review.map((rule) => `- ${rule}`),
    ]),
  ].join('\n');

/** Shared visual defaults and dashboard review guidance for the main agent. */
export const getDashboardReviewPromptContent = (): string =>
  [getDashboardReviewTopicsContent(), getChartTypeReviewPromptContent()].join('\n');
