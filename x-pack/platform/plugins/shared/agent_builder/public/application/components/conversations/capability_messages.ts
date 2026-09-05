/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SolutionView } from '@kbn/spaces-plugin/common';

const classicCapabilityMessages = [
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.classic.createDashboardsDetail',
    {
      defaultMessage: 'I can create dashboards',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.classic.analyzeIncidentsDetail',
    {
      defaultMessage: 'I can analyze incidents',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.classic.investigateAnomaliesDetail',
    {
      defaultMessage: 'I can investigate anomalies',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.classic.exploreYourDataDetail',
    {
      defaultMessage: 'I can explore your data',
    }
  ),
] as const;

const observabilityCapabilityMessages = [
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.observability.investigateAlertsDetail',
    {
      defaultMessage: 'I can investigate alerts',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.observability.analyzeServiceHealthDetail',
    {
      defaultMessage: 'I can analyze service health',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.observability.correlateLogsAndMetricsDetail',
    {
      defaultMessage: 'I can correlate logs and metrics',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.observability.exploreApmTracesDetail',
    {
      defaultMessage: 'I can explore APM traces',
    }
  ),
] as const;

const securityCapabilityMessages = [
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.security.triageAlertsDetail',
    {
      defaultMessage: 'I can triage security alerts',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.security.investigateDetectionsDetail',
    {
      defaultMessage: 'I can investigate detections',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.security.analyzeThreatsDetail',
    {
      defaultMessage: 'I can analyze threats',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.security.exploreEndpointFindingsDetail',
    {
      defaultMessage: 'I can explore endpoint findings',
    }
  ),
] as const;

const elasticsearchCapabilityMessages = [
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.elasticsearch.runEsqlQueriesDetail',
    {
      defaultMessage: 'I can run ES|QL queries',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.elasticsearch.exploreIndicesDetail',
    {
      defaultMessage: 'I can explore indices',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.elasticsearch.buildSearchExperiencesDetail',
    {
      defaultMessage: 'I can build search experiences',
    }
  ),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.elasticsearch.analyzeRelevanceDetail',
    {
      defaultMessage: 'I can analyze search relevance',
    }
  ),
] as const;

const CAPABILITY_MESSAGES_BY_SOLUTION: Partial<Record<SolutionView, readonly string[]>> & {
  classic: readonly string[];
} = {
  classic: classicCapabilityMessages,
  oblt: observabilityCapabilityMessages,
  security: securityCapabilityMessages,
  es: elasticsearchCapabilityMessages,
};

export const getCapabilityMessagesForSolution = (solution: SolutionView): readonly string[] =>
  CAPABILITY_MESSAGES_BY_SOLUTION[solution] ?? CAPABILITY_MESSAGES_BY_SOLUTION.classic;
