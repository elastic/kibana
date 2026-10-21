/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ProposalUser } from '@kbn/proposals-common';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import type { ResolveWorkerName } from '../services/resolve_worker_name';

/** The acting user, named after the Worker when the account has no full name of its own. */
export const resolveStepUser = async ({
  request,
  executionId,
  spaceId,
  resolveUser,
  resolveWorkerName,
}: {
  request: KibanaRequest;
  executionId: string;
  spaceId: string;
  resolveUser: ResolveProposalUser;
  resolveWorkerName: ResolveWorkerName;
}): Promise<ProposalUser | undefined> => {
  const user = await resolveUser(request);
  if (!user || user.fullName) {
    return user;
  }
  const fullName = await resolveWorkerName({ executionId, spaceId, request });
  return fullName ? { ...user, fullName } : user;
};
