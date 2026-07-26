/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum length of a single tag (label). Matches the server's `tagsSchema`. */
export const MAX_TAG_LENGTH = 128;

/** Maximum number of tags allowed on a single resource. Matches the server's `tagsSchema`. */
export const MAX_TAGS = 20;
