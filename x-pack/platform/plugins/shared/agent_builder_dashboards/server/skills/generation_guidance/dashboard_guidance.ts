/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartTypeReviewPromptContent } from '@kbn/agent-builder-visualizations-server';
import { dashboardRuleRegistry } from './dashboard_rule_registry';

const compileTopicRules = (
  topic: string,
  rules: string[],
  review: { critical?: string[]; suggestions?: string[] } = {}
): string[] => {
  const { critical = [], suggestions = [] } = review;

  if (!rules.length && !critical.length && !suggestions.length) {
    return [];
  }

  const needsTopicHeading = !(rules.length === 1 && rules[0].trimStart().startsWith('#'));

  return [
    ...(needsTopicHeading ? [`### ${topic}`] : []),
    ...rules.map((rule) => (rule.includes('\n') ? rule.trim() : `- ${rule}`)),
    ...(critical.length ? ['Critical:', ...critical.map((rule) => `- ${rule}`)] : []),
    ...(suggestions.length ? ['Suggestions:', ...suggestions.map((rule) => `- ${rule}`)] : []),
  ];
};

/**
 * HOW rules for the dashboard agent. Inlined in the skill body.
 * Review critical issues and suggestions are omitted so they are not paid twice
 * when a later review loop compiles {@link getDashboardReviewPromptContent}.
 */
export const getDashboardDesignPromptContent = (): string => {
  const sections = Object.entries(dashboardRuleRegistry).flatMap(([topic, { prompt }]) =>
    compileTopicRules(topic, prompt.config?.rules ?? [])
  );

  if (!sections.length) {
    return '';
  }

  return ['## Dashboard Design', ...sections].join('\n');
};

/** Dashboard-registry review topics only — no chart-type review. */
export const getDashboardReviewTopicsContent = (): string => {
  const sections = Object.entries(dashboardRuleRegistry).flatMap(([topic, { prompt }]) =>
    compileTopicRules(topic, [], prompt.review)
  );

  if (!sections.length) {
    return '';
  }

  return ['## Dashboard Review', ...sections].join('\n');
};

/**
 * Painted failures and judge-only exceptions from the dashboard registry,
 * plus chart-type review from {@link getChartTypeReviewPromptContent}.
 * Dashboard `config.rules` are already in the skill body via
 * {@link getDashboardDesignPromptContent} — do not compile them again here.
 */
export const getDashboardReviewPromptContent = (): string => {
  const topics = getDashboardReviewTopicsContent();
  const chartReview = getChartTypeReviewPromptContent();

  if (!topics && !chartReview) {
    return '';
  }

  return [topics || '## Dashboard Review', ...(chartReview ? [chartReview] : [])].join('\n');
};
