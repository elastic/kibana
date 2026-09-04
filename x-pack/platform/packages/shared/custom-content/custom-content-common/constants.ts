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

/** Browser feature flag gating the "Custom" entry in the dashboard "Add panel" menu. Off by default. */
export const CUSTOM_CONTENT_ENABLED_FLAG_KEY = 'dashboard.customContent.enabled';

/**
 * Bounds for the height a generated template declares for itself.
 *
 * The panel renders in a sandboxed iframe with scripting disabled, so its content
 * cannot report its own size and the host cannot read across the opaque origin to
 * measure it. The generating model declares an intended height instead — a guess,
 * but an informed one, and the only estimate available before the panel renders.
 * Clamped because the value is model-authored.
 */
export const CUSTOM_CONTENT_DEFAULT_HEIGHT = 320;
/** Matches the renderer's own iframe-container floor. A smaller value would size a host
 * container shorter than the content box inside it, which overflows rather than shrinks. */
export const CUSTOM_CONTENT_MIN_HEIGHT = 200;
export const CUSTOM_CONTENT_MAX_HEIGHT = 1200;
