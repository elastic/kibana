/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Filter correlations by match type
 */
export const filterCorrelationsByType = (
  correlations: any[],
  matchTypes: string[]
): any[] => {
  return correlations.filter((c: any) => matchTypes.includes(c.match_type));
};

/**
 * Count Slack messages in correlations
 */
export const countCorrelatedSlackMessages = (correlations: any[]): number => {
  return correlations.reduce((count: number, corr: any) => {
    if (corr.slack && Array.isArray(corr.slack)) {
      return count + corr.slack.length;
    }
    return count;
  }, 0);
};

/**
 * Collect all Slack messages from correlations
 */
export const collectCorrelatedSlackMessages = (correlations: any[]): any[] => {
  const messages: any[] = [];
  correlations.forEach((corr: any) => {
    if (corr.slack && Array.isArray(corr.slack)) {
      messages.push(...corr.slack);
    }
  });
  return messages;
};

/**
 * Deduplicate messages by permalink or timestamp
 */
export const deduplicateMessages = (messages: any[]): any[] => {
  const uniqueMessages = new Map();
  messages.forEach((msg: any) => {
    const key = msg.permalink || msg.ts || msg.text;
    if (key && !uniqueMessages.has(key)) {
      uniqueMessages.set(key, msg);
    }
  });
  return Array.from(uniqueMessages.values());
};

/**
 * Get correlation type descriptions
 */
export const getCorrelationTypeDescriptions = (): Record<string, string> => {
  return {
    exact_case_alert: 'Cases with linked alerts',
    slack_case_url: 'Slack messages mentioning cases',
    slack_alert_url: 'Slack messages mentioning alerts',
    slack_attack_discovery_url: 'Slack messages mentioning attack discoveries',
    entity_service: 'Service-related correlations across sources',
    entity_alert_id: 'Alerts mentioned in external sources',
    entity_host_observability: 'Observability cases linked to hosts',
    entity_host_attack_discovery: 'Attack discoveries linked to hosts',
    entity_host_security_case: 'Security cases linked to hosts',
    entity_service_observability: 'Observability cases linked to services',
    entity_service_attack_discovery: 'Attack discoveries linked to services',
  };
};

/**
 * Extract mentioned entities from correlations
 */
export const extractMentionedEntities = (correlations: any[]) => {
  const mentionedServices = new Set<string>();
  const mentionedCases = new Set<string>();
  const mentionedAlerts = new Set<string>();

  correlations.forEach((corr: any) => {
    if (corr.service) mentionedServices.add(corr.service);
    if (corr.case) mentionedCases.add(corr.case);
    if (corr.alert && corr.alert !== 'linked_alerts') mentionedAlerts.add(corr.alert);
  });

  return { mentionedServices, mentionedCases, mentionedAlerts };
};

/**
 * Prioritize correlations by confidence and severity
 */
export const prioritizeCorrelations = (
  correlations: any[],
  limit: number = 10
): any[] => {
  return [...correlations]
    .sort((a: any, b: any) => {
      const aScore =
        (a.confidence || 0) * 100 +
        (a.severity === 'critical' ? 50 : a.severity === 'high' ? 25 : 0);
      const bScore =
        (b.confidence || 0) * 100 +
        (b.severity === 'critical' ? 50 : b.severity === 'high' ? 25 : 0);
      return bScore - aScore;
    })
    .slice(0, limit);
};

