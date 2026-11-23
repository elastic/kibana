/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { countPendingProposals } from './count_pending_proposals';

describe('countPendingProposals', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();

  const createProposals = ({
    assertCanRead = jest.fn().mockResolvedValue(undefined),
    count = jest.fn().mockResolvedValue(new Map([['conv-1', 2]])),
  } = {}) => ({
    assertCanRead,
    count,
    proposals: {
      getProposalPrivileges: () => ({ assertCanRead }),
      getProposalsService: () => ({ countPendingByConversationIds: count }),
    } as unknown as ProposalsPluginStart,
  });

  const run = (proposals: ProposalsPluginStart | undefined) =>
    countPendingProposals({
      proposals,
      request,
      conversationIds: ['conv-1', 'conv-2'],
      spaceId: 'space-1',
      logger,
    });

  beforeEach(() => jest.clearAllMocks());

  it('counts in the given space', async () => {
    const { proposals, count } = createProposals();

    expect(await run(proposals)).toEqual(new Map([['conv-1', 2]]));
    expect(count).toHaveBeenCalledWith(['conv-1', 'conv-2'], 'space-1');
  });

  it('returns undefined when the proposals plugin is absent', async () => {
    expect(await run(undefined)).toBeUndefined();
  });

  it('returns undefined, without counting or logging, when the caller may not read proposals', async () => {
    const { proposals, count } = createProposals({
      assertCanRead: jest.fn().mockRejectedValue(new Error('forbidden')),
    });

    expect(await run(proposals)).toBeUndefined();
    expect(count).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('logs and returns undefined when the count itself fails', async () => {
    const { proposals } = createProposals({
      count: jest.fn().mockRejectedValue(new Error('shard unavailable')),
    });

    expect(await run(proposals)).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(
      'Could not count pending proposals: shard unavailable'
    );
  });
});
