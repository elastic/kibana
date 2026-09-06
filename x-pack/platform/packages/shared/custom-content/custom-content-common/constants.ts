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
