/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const escalationQueryKeys = {
  all: ['agenticInvestigations', 'escalations'] as const,
  /**
   * Include all response-shaping inputs so React Query re-fetches when any of
   * them changes. Omitting page or perPage would cause a page flip to return
   * stale data from the previous page's cache entry.
   */
  /** Prefix of every list variant, for refreshing all that are on screen. */
  lists: () => [...escalationQueryKeys.all, 'list'] as const,
  list: (
    status?: string,
    page?: number,
    perPage?: number,
    search?: string,
    entity?: string | null
  ) =>
    [
      ...escalationQueryKeys.lists(),
      status ?? 'open',
      page ?? 1,
      perPage ?? null,
      search ?? '',
      entity ?? null,
    ] as const,
  /** Entities across every escalation. Under `all`, so any escalation change refreshes it. */
  impactPills: () => [...escalationQueryKeys.all, 'impactPills'] as const,
  /**
   * Key for the linked-investigations list of a single escalation.
   *
   * `linkedIds` is the comma-joined list of linked investigation ids read from the escalation
   * conversation's metadata. Including it means the flyout's 5 s conversation poll triggers a
   * re-fetch here whenever a new investigation is linked.
   */
  linkedInvestigations: (escalationId: string, linkedIds?: string) =>
    [...escalationQueryKeys.all, 'linkedInvestigations', escalationId, linkedIds ?? ''] as const,
  /**
   * Key for the escalations-by-investigation lookup used by the escalation creation modal to
   * display a warning when the investigation is already part of one or more open escalations.
   * Nested under `all` so `invalidateEscalations` sweeps it along with the rest.
   */
  forInvestigation: (investigationId: string) =>
    [...escalationQueryKeys.all, 'forInvestigation', investigationId] as const,
};
