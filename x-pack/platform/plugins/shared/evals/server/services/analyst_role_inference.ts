/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Analyst Role Inference Service
 *
 * Detects the analyst's primary role by analyzing Kibana event log patterns
 * (user actions over past 7 days). Infers roles from:
 * - Alert triage frequency (SOC analyst)
 * - Dashboard customization (threat hunter)
 * - Detection rule interaction (security engineer)
 * - Log search frequency (ops analyst)
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

export type AnalystRole =
  | 'soc_analyst'
  | 'threat_hunter'
  | 'security_engineer'
  | 'ops_analyst'
  | 'unknown';

export interface RoleInference {
  role: AnalystRole;
  confidence: number; // 0-1, higher = more confident
  scores: Record<AnalystRole, number>;
  eventCount: number;
}

/**
 * Infer analyst role from Kibana event log analysis.
 */
export async function inferAnalystRole(
  esClient: IScopedClusterClient,
  logger: Logger,
  userId?: string
): Promise<RoleInference> {
  logger.debug('[AESOP] Starting analyst role inference...');

  try {
    // Query event log for user actions (past 7 days)
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 7);

    const query = {
      bool: {
        must: [{ range: { '@timestamp': { gte: startTime.toISOString() } } }],
        ...(userId && { filter: [{ term: { 'user.id': userId } }] }),
      },
    };

    // Scope to the current user's RBAC. `.kibana-event-log-*` contains
    // other users' activity; reading it via `asInternalUser` would leak
    // that activity into the LLM prompt for a caller who cannot normally
    // read it. Callers that lack read access will gracefully fall through
    // to the default `ops_analyst` role below.
    const eventsResponse = await esClient.asCurrentUser.search({
      index: '.kibana-event-log-*',
      size: 5000,
      query,
      _source: ['event.action', 'kibana.alert.id', 'kibana.savedObjects', 'request.url'],
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const events = eventsResponse.hits.hits.map((hit) => hit._source as Record<string, any>);

    if (events.length === 0) {
      logger.debug('[AESOP] No event log entries found, returning default role');
      return {
        role: 'ops_analyst',
        confidence: 0,
        scores: {
          soc_analyst: 0,
          threat_hunter: 0,
          security_engineer: 0,
          ops_analyst: 1,
          unknown: 0,
        },
        eventCount: 0,
      };
    }

    // Analyze action patterns
    const scores = analyzeActionPatterns(events);

    // Find highest-scoring role
    let topRole: AnalystRole = 'ops_analyst';
    let topScore = 0;

    for (const [role, score] of Object.entries(scores)) {
      if (score > topScore) {
        topScore = score;
        topRole = role as AnalystRole;
      }
    }

    // Calculate confidence (how dominant is top role vs others)
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? topScore / totalScore : 0;

    logger.info(
      `[AESOP] Inferred role: ${topRole} (confidence: ${(confidence * 100).toFixed(1)}%, events: ${
        events.length
      })`
    );

    return {
      role: topRole,
      confidence,
      scores,
      eventCount: events.length,
    };
  } catch (error) {
    logger.debug('[AESOP] Role inference error:', error);
    // Return default if error
    return {
      role: 'ops_analyst',
      confidence: 0,
      scores: {
        soc_analyst: 0,
        threat_hunter: 0,
        security_engineer: 0,
        ops_analyst: 1,
        unknown: 0,
      },
      eventCount: 0,
    };
  }
}

/**
 * Analyze action patterns to score each role.
 */
function analyzeActionPatterns(events: Record<string, any>[]): Record<AnalystRole, number> {
  const scores: Record<AnalystRole, number> = {
    soc_analyst: 0,
    threat_hunter: 0,
    security_engineer: 0,
    ops_analyst: 0,
    unknown: 0,
  };

  // Count action types
  const actionCounts = new Map<string, number>();

  for (const event of events) {
    const action = event['event.action'] as string | undefined;
    if (action) {
      actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
    }
  }

  // Score each role based on action patterns
  for (const [action, count] of actionCounts.entries()) {
    const weight = Math.log(count + 1); // Log scale so high-frequency actions don't dominate

    // SOC Analyst: triages alerts, views dashboards, searches
    if (
      action.includes('alert') ||
      action.includes('triage') ||
      action.includes('workflow_status') ||
      action.includes('view')
    ) {
      scores.soc_analyst += weight;
    }

    // Threat Hunter: creates searches, runs queries, customizes dashboards
    if (
      action.includes('create') ||
      action.includes('search') ||
      action.includes('query') ||
      action.includes('save')
    ) {
      scores.threat_hunter += weight;
    }

    // Security Engineer: manages detection rules, creates rules, edits rules
    if (
      action.includes('rule') ||
      action.includes('detection') ||
      action.includes('manage') ||
      action.includes('edit')
    ) {
      scores.security_engineer += weight;
    }

    // Ops Analyst: monitors, views metrics, checks health
    if (
      action.includes('monitor') ||
      action.includes('metric') ||
      action.includes('health') ||
      action.includes('performance')
    ) {
      scores.ops_analyst += weight;
    }
  }

  // Also check URL patterns if available
  const urlCounts = new Map<string, number>();
  for (const event of events) {
    const url = event['request.url'] as string | undefined;
    if (url) {
      urlCounts.set(url, (urlCounts.get(url) ?? 0) + 1);
    }
  }

  for (const [url, count] of urlCounts.entries()) {
    const weight = Math.log(count + 1);

    if (url.includes('/app/security/alerts') || url.includes('alerts')) {
      scores.soc_analyst += weight * 0.5;
    }

    if (url.includes('/app/security/rules') || url.includes('rules')) {
      scores.security_engineer += weight * 0.5;
    }

    if (url.includes('/app/discover')) {
      scores.threat_hunter += weight * 0.5;
    }

    if (url.includes('/app/metrics')) {
      scores.ops_analyst += weight * 0.5;
    }
  }

  return scores;
}

/**
 * Get human-readable description of a role for logging/UI.
 */
export function describeRole(role: AnalystRole): string {
  const descriptions: Record<AnalystRole, string> = {
    soc_analyst: 'SOC Analyst (alert triage and response)',
    threat_hunter: 'Threat Hunter (investigation and detection)',
    security_engineer: 'Security Engineer (rule management)',
    ops_analyst: 'Operations Analyst (monitoring and metrics)',
    unknown: 'Unknown Role',
  };

  return descriptions[role];
}
