/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ProposalUser } from '@kbn/proposals-common';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import type { ResolveWorkerUser } from '../services/resolve_worker_user';

/** The acting user: the Worker when a service account is acting, otherwise whoever the request names. */
export const resolveStepUser = async ({
  request,
  executionId,
  spaceId,
  resolveUser,
  resolveWorkerUser,
}: {
  request: KibanaRequest;
  executionId: string;
  spaceId: string;
  resolveUser: ResolveProposalUser;
  resolveWorkerUser: ResolveWorkerUser;
}): Promise<ProposalUser | undefined> =>
  (await resolveWorkerUser({ executionId, spaceId, request })) ?? resolveUser(request);
