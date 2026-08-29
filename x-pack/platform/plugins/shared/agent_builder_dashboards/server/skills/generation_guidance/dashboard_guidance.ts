/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardRuleRegistry } from './dashboard_rule_registry';

const compileTopicRules = (
  topic: string,
  rules: string[],
  extras: { misses?: string[]; considerations?: string[] } = {}
): string[] => {
  const misses = extras.misses ?? [];
  const considerations = extras.considerations ?? [];

  if (!rules.length && !misses.length && !considerations.length) {
    return [];
  }

  return [
    `### ${topic}`,
    ...rules.map((rule) => `- ${rule}`),
    ...misses.map((rule) => `- ${rule}`),
    ...(considerations.length
      ? ['Considerations:', ...considerations.map((rule) => `- ${rule}`)]
      : []),
  ];
};

/**
 * HOW rules for the dashboard agent. Inlined in the skill body.
 * Review misses and considerations are omitted so they are not paid twice
 * when a later review loop compiles {@link getDashboardReviewPromptContent}.
 */
export const getDashboardAuthoringPromptContent = (): string => {
  const sections = Object.entries(dashboardRuleRegistry).flatMap(([topic, { prompt }]) =>
    compileTopicRules(topic, prompt.config?.rules ?? [])
  );

  if (!sections.length) {
    return '';
  }

  return ['## Dashboard Design', ...sections].join('\n');
};

/**
 * Compiles authoring `config.rules` plus `review.misses` and
 * `review.considerations` for every dashboard topic. Use this in a review
 * loop; do not also append {@link getDashboardAuthoringPromptContent} when
 * the skill body is already in the conversation.
 */
export const getDashboardReviewPromptContent = (): string => {
  const sections = Object.entries(dashboardRuleRegistry).flatMap(([topic, { prompt }]) =>
    compileTopicRules(topic, prompt.config?.rules ?? [], {
      misses: prompt.review?.misses,
      considerations: prompt.review?.considerations,
    })
  );

  if (!sections.length) {
    return '';
  }

  return ['DASHBOARD REVIEW RULES:', ...sections].join('\n');
};
