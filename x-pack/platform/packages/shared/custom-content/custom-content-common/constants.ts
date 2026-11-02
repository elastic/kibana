/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CUSTOM_CONTENT_EMBEDDABLE_TYPE = 'custom_content';

export const CUSTOM_CONTENT_SCRIPT_PATTERN = /<script[\s>/]/i;

export const CUSTOM_CONTENT_MAX_PROMPT_LENGTH = 10_000;
export const CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH = 1_000_000;
/** Maximum UTF-8 byte size of a rendered template. Enforced server-side on both the generation and agent paths. */
export const CUSTOM_CONTENT_MAX_TEMPLATE_BYTES = 500_000;
/** Character (code-point) cap for schema validation — set well above the byte cap so ASCII content has headroom but keep in sync with CUSTOM_CONTENT_MAX_TEMPLATE_BYTES for byte-level checks. */
export const CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH = 510_000;

/**
 * Bounds for the height a generated template declares for itself. The panel renders in a
 * sandboxed iframe with scripting disabled, so nothing can measure the content: the model's
 * declared height is the only estimate available, and is clamped because it is model-authored.
 */
export const CUSTOM_CONTENT_DEFAULT_HEIGHT = 320;
/** Matches the renderer's iframe-container floor; below it the host container overflows. */
export const CUSTOM_CONTENT_MIN_HEIGHT = 200;
export const CUSTOM_CONTENT_MAX_HEIGHT = 1200;

export const CUSTOM_CONTENT_UPDATE_PANEL_TOOL_ID = 'custom_content_update_panel';

/**
 * Id of the dashboard generation tool, which custom content flows name or match on. Inlined rather
 * than imported from the `agent_builder_dashboards` plugin to avoid a plugin dependency for a
 * string; keep in sync with `dashboardTools.generateDashboard` there.
 */
export const CUSTOM_CONTENT_GENERATE_DASHBOARD_TOOL_ID = 'platform.dashboard.generate_dashboard';
