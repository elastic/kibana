/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SIG_EVENTS_NAMESPACE = 'platform.streams.sig_events';

export const SIG_EVENTS_TOOL_IDS = {
  listStreams: `${SIG_EVENTS_NAMESPACE}.list_streams`,
  listFeatures: `${SIG_EVENTS_NAMESPACE}.list_features`,
  listQueries: `${SIG_EVENTS_NAMESPACE}.list_queries`,
  listSignificantEvents: `${SIG_EVENTS_NAMESPACE}.list_significant_events`,
  listDiscoveries: `${SIG_EVENTS_NAMESPACE}.list_discoveries`,
} as const;
