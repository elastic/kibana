/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only treat a search term as a candidate id when it looks like a UUID — Kibana saved objects
 * created via the API use UUIDs by default. Avoids polluting id filters with ordinary words like
 * "rule" or "cpu".
 */
export const looksLikeSavedObjectId = (value: string): boolean => UUID_PATTERN.test(value);
