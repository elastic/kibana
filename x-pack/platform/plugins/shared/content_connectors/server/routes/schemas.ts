/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/** Elasticsearch document `_id` values (connectors, sync jobs, API keys) are limited to 512 bytes. */
export const MAX_ID_LENGTH = 512;

/**
 * Elasticsearch index names are limited to 255 bytes. Path params may arrive URL-encoded
 * (up to 3 bytes per character), so allow some headroom before the route decodes them.
 */
export const MAX_INDEX_NAME_LENGTH = 1024;

/** Short, enum-like values: service types, statuses, languages, cron intervals, field names. */
export const MAX_SHORT_STRING_LENGTH = 256;

/** Human readable names (connector name, pipeline name, ...). */
export const MAX_NAME_LENGTH = 1024;

/** User-typed search terms used to filter connector / index lists. */
export const MAX_SEARCH_QUERY_LENGTH = 1000;

/** Free-text descriptions and sync-rule values. */
export const MAX_DESCRIPTION_LENGTH = 10_000;

/**
 * Large free-form payloads: advanced sync rule snippets (arbitrary JSON) and connector
 * configuration values (which may contain certificates, private keys or service-account JSON).
 */
export const MAX_FREEFORM_LENGTH = 100_000;

export const idSchema = schema.string({ maxLength: MAX_ID_LENGTH });
export const indexNameSchema = schema.string({ maxLength: MAX_INDEX_NAME_LENGTH });
export const shortStringSchema = schema.string({ maxLength: MAX_SHORT_STRING_LENGTH });
export const nameSchema = schema.string({ maxLength: MAX_NAME_LENGTH });
export const searchQuerySchema = schema.string({ maxLength: MAX_SEARCH_QUERY_LENGTH });
export const descriptionSchema = schema.string({ maxLength: MAX_DESCRIPTION_LENGTH });
export const freeformStringSchema = schema.string({ maxLength: MAX_FREEFORM_LENGTH });
