/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Max length of a page name / id / category / tag. */
export const MAX_MEMORY_ID_LENGTH = 255;
/** Max length of a page title. */
export const MAX_MEMORY_TITLE_LENGTH = 512;
/** Max length of page content, and of a single patch operation's text. */
export const MAX_MEMORY_TEXT_LENGTH = 10_000;
/** Max number of entries in an array field (categories, tags, references). */
export const MAX_MEMORY_ARRAY_LENGTH = 100;
