/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Stable saved object id for the managed Agent Builder overview dashboard. */
export const AGENT_BUILDER_OVERVIEW_DASHBOARD_ID = 'agent-builder-token-usage';

/**
 * Bump when panel layout or visualization definitions change so startup reinstall
 * overwrites the managed dashboard with the latest asset bundle.
 */
export const AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION = 1;

export const AGENT_BUILDER_TRACE_INDEX = 'traces-agent_builder.otel-default';

export const AGENT_BUILDER_DATASET_FILTER =
  '| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend AND data_stream.dataset == "agent_builder"';

/** Pin SO versions past legacy Lens migrations (see inference dashboard installer). */
export const AGENT_BUILDER_DASHBOARD_CORE_MIGRATION_VERSION = '8.8.0';
export const AGENT_BUILDER_DASHBOARD_TYPE_MIGRATION_VERSION = '10.3.0';
