/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes regex metacharacters so caller-supplied text is matched literally.
 *
 * Used to build the `include` pattern of a terms aggregation, which
 * Elasticsearch evaluates as a regular expression anchored on the whole term.
 */
export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
