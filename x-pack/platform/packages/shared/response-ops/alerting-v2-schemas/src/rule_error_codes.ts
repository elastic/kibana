/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The code a rules API returns, with a 404, when a rule with the given
 * identifier does not exist. It lives beside the response schemas, rather than
 * only in the server's error catalog, because the browser recognizes it to tell
 * a genuinely missing rule apart from other 404s.
 */
export const RULE_NOT_FOUND_CODE = 'RULE_NOT_FOUND';
