/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** HTTP status the feedback loop routes use for a request the current state already answers. */
const CONFLICT = 409;

/**
 * Whether a failed request lost a race rather than went wrong.
 *
 * The routes reserve 409 for requests that are refused because the world moved on — an improvement
 * someone else already decided, an analysis run already in flight. Those are worth telling the user
 * about plainly, not as errors, so this is what separates the two at the call site.
 */
export const isConflict = (error: Error): boolean =>
  (error as { body?: { statusCode?: number } }).body?.statusCode === CONFLICT;
