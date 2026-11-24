/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Principal } from '@kbn/ols';

/**
 * State shared by every scoped service created for one request, so that the principal is resolved
 * and recovery checked at most once per request. It lives as long as the request object, and
 * assumes that the request keeps one credential. HTTP and Task Manager requests do. A service
 * account workload's request loses its header when its run ends, but work that the run started can
 * outlive it, as a cancelled Workflows step does. That work keeps the run's authority here, as it
 * does in Elasticsearch, because the clients it already holds keep the run's token.
 */
export interface RequestState {
  /** The principal of the request, once resolved. */
  principal?: Promise<Principal | undefined>;
  /** Recovery answers, keyed by `type:spaceId`. */
  recovery: Map<string, Promise<boolean>>;
  /** Audit events already written for this request. */
  auditedEvents: Set<string>;
  /** Objects already reported as having a damaged ACL. */
  reportedInvalidAcls: Set<string>;
  /** Whether each grant recipient exists, keyed by `type:id`, including lookups in progress. */
  recipients: Map<string, Promise<boolean>>;
}

export const createRequestState = (): RequestState => ({
  recovery: new Map(),
  auditedEvents: new Set(),
  reportedInvalidAcls: new Set(),
  recipients: new Map(),
});
