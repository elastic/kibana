/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Stable saved object id for the managed Agent Builder overview dashboard. */
export const AGENT_BUILDER_OVERVIEW_DASHBOARD_ID = 'agent-builder-overview';

/**
 * Bump when panel layout or visualization definitions change so startup reinstall
 * overwrites the managed dashboard with the latest asset bundle.
 */
export const AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION = 1;

/** Placeholder in dashboard ES|QL queries replaced with the Kibana space namespace at install time. */
export const AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER = '__AGENT_BUILDER_TRACES_NAMESPACE__';

/**
 * Pin SO versions past legacy Lens migrations.
 * Reference: x-pack/platform/plugins/shared/observability_ai_assistant/server/service/dashboard_manager.ts
 */
export const AGENT_BUILDER_DASHBOARD_CORE_MIGRATION_VERSION = '8.8.0';
export const AGENT_BUILDER_DASHBOARD_TYPE_MIGRATION_VERSION = '10.3.0';
