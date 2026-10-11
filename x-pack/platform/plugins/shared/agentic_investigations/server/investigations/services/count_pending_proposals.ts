/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';

/**
 * Pending proposals per conversation, in one aggregation. Undefined when the proposals plugin is
 * absent or the caller may not read proposals, so a list does not need that privilege. A failed
 * count is logged and also yields undefined, so a read never fails because of it.
 */
export const countPendingProposals = async ({
  proposals,
  request,
  conversationIds,
  spaceId,
  logger,
}: {
  proposals: ProposalsPluginStart | undefined;
  request: KibanaRequest;
  conversationIds: string[];
  spaceId: string;
  logger: Logger;
}): Promise<Map<string, number> | undefined> => {
  if (!proposals) {
    return undefined;
  }
  try {
    await proposals.getProposalPrivileges().assertCanRead(request);
  } catch {
    return undefined;
  }
  try {
    return await proposals
      .getProposalsService()
      .countPendingByConversationIds(conversationIds, spaceId);
  } catch (error) {
    logger.debug(
      `Could not count pending proposals: ${error instanceof Error ? error.message : String(error)}`
    );
    return undefined;
  }
};
