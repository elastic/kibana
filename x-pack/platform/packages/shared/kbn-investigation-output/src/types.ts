/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationReference, InvestigationState } from '@kbn/significant-events-schema';

/**
 * Where an investigation is in its lifecycle, from the point of view of a consumer rendering it:
 * - `running` — the investigation is still in progress (live progress may be streaming in).
 * - `loading` — the investigation is over; its persisted result is being fetched.
 * - `complete` — the investigation finished and its final state is available.
 * - `failed` — the investigation itself failed (the workflow or its investigate step errored).
 * - `unavailable` — the investigation may have succeeded, but its result couldn't be
 *   loaded or parsed (e.g. missing privileges, or an incompatible result format).
 */
export type InvestigationStatus = 'running' | 'loading' | 'complete' | 'failed' | 'unavailable';

export interface InvestigationOutputProps {
  status: InvestigationStatus;
  /** Current (while running) or final (once complete) investigation state. */
  state?: InvestigationState;
  /** Detail message for the `failed` and `unavailable` statuses. */
  error?: string;
  /**
   * Resolves a reference on an investigation-trail node into a link — e.g. a Discover URL for
   * `query` references. References without a resolvable href render as plain chips, so this is
   * optional and may return `undefined` per reference.
   */
  getReferenceHref?: (reference: InvestigationReference) => string | undefined;
}
