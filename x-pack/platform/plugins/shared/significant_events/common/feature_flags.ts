/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Outermost availability gate for the significant events Technical Preview. Evaluated before the
 * pricing tier, license, and required-plugin checks. Falls back to `false` so self-managed and
 * LaunchDarkly-unreachable deployments stay off during Tech Preview; the controlled rollout is
 * driven from the elastic/kibana-feature-flags repository.
 *
 * Scope is per-deployment, not per-space: it is read through `featureFlags.getBooleanValue`, so the
 * feature is on or off for the whole Kibana instance. This flag replaces the removed space-scoped
 * `observability:streamsEnableSignificantEvents(Discovery)` Advanced Settings, so there is no longer
 * a per-space kill switch. Any values previously persisted for those settings (the `config` saved
 * object or `uiSettings.overrides` in kibana.yml) are inert; Kibana ignores unregistered uiSettings
 * keys, so no migration is needed and stale values do not affect gating.
 */
export const STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG = 'streams.significantEventsAvailable';

/**
 * Enables grounding of significant events query generation against source code indexed via
 * Semantic Code Search (SCS). When enabled and a stream is linked to a code index, the query
 * generation reasoning agent can consult the source code (through the installed SCS Kibana
 * workflows) to verify hypotheses before emitting ES|QL queries.
 */
export const SIGNIFICANT_EVENTS_SEMANTIC_CODE_SEARCH_GROUNDING_ENABLED_FLAG =
  'streams.significantEventsSemanticCodeSearchGroundingEnabled';

/**
 * Enables the Apps section under Significant Events settings, where third-party
 * integrations (e.g. the Elastic Slack App) can be connected via the Relay service.
 */
export const STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG = 'streams.significantEventsAppsEnabled';
