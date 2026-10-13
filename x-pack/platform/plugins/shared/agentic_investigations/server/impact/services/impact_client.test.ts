/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { InvestigationsForbiddenError } from '../../investigations/services/investigations_forbidden_error';
import { MAX_IMPACT_CONVERSATION_IDS } from '../../../common/impact/constants';
import { createImpactClient } from './impact_client';
import type { ImpactService } from './impact_service';

const request = httpServerMock.createKibanaRequest();

/** A `bulkGet` that returns the ids in `readable`, or every requested id when omitted. */
const bulkGetReturning = (readable?: string[]) =>
  jest.fn(async (ids: string[]) => {
    const visible = readable ? ids.filter((id) => readable.includes(id)) : ids;
    return new Map(visible.map((id) => [id, { id }]));
  });

const createClient = ({
  listByConversationIds = jest.fn().mockResolvedValue([]),
  assertCanRead = jest.fn().mockResolvedValue(undefined),
  getSpaceId = jest.fn().mockReturnValue('space-from-request'),
  bulkGet = bulkGetReturning(),
}: {
  listByConversationIds?: jest.Mock;
  assertCanRead?: jest.Mock;
  getSpaceId?: jest.Mock;
  bulkGet?: jest.Mock;
} = {}) => {
  const privileges: InvestigationsPrivilegesChecker = {
    assertCanRead,
    assertCanManage: jest.fn(),
  };
  const client = createImpactClient({
    getImpactService: () => ({ listByConversationIds } as unknown as ImpactService),
    getSpaceId,
    privileges,
    getConversationClient: async () => ({ bulkGet } as unknown as ConversationPublicClient),
  })(request);

  return { client, listByConversationIds, assertCanRead, getSpaceId, bulkGet };
};

describe('createImpactClient', () => {
  it('should read in the request space after the privilege check', async () => {
    const { client, listByConversationIds, assertCanRead, getSpaceId } = createClient();

    await client.listByConversationIds(['c1', 'c2']);

    expect(assertCanRead).toHaveBeenCalledWith(request);
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(listByConversationIds).toHaveBeenCalledWith(['c1', 'c2'], 'space-from-request');
  });

  it('should only read impact of conversations the caller can read', async () => {
    const { client, listByConversationIds, bulkGet } = createClient({
      bulkGet: bulkGetReturning(['c2']),
    });

    await client.listByConversationIds(['c1', 'c2', 'c2']);

    expect(bulkGet).toHaveBeenCalledWith(['c1', 'c2']);
    expect(listByConversationIds).toHaveBeenCalledWith(['c2'], 'space-from-request');
  });

  it('should not read the impact index when the caller can read none of the conversations', async () => {
    const { client, listByConversationIds } = createClient({ bulkGet: bulkGetReturning([]) });

    expect(await client.listByConversationIds(['private-1'])).toEqual([]);
    expect(listByConversationIds).not.toHaveBeenCalled();
  });

  it('should refuse before searching when the principal cannot manage investigations', async () => {
    const { client, listByConversationIds, getSpaceId } = createClient({
      assertCanRead: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope')),
    });

    await expect(client.listByConversationIds(['c1'])).rejects.toBeInstanceOf(
      InvestigationsForbiddenError
    );
    expect(listByConversationIds).not.toHaveBeenCalled();
    expect(getSpaceId).not.toHaveBeenCalled();
  });

  describe('getEntityIdsByConversationId', () => {
    const impact = (conversationId: string, ...ids: string[]) => ({
      conversationId,
      entities: ids.map((id) => ({ id })),
    });

    it('should leave out conversations the caller cannot read', async () => {
      const { client, listByConversationIds } = createClient({
        listByConversationIds: jest.fn().mockResolvedValue([impact('c1', 'host-1')]),
        bulkGet: bulkGetReturning(['c1']),
      });

      const result = await client.getEntityIdsByConversationId(['c1', 'someone-elses-private']);

      expect(listByConversationIds).toHaveBeenCalledWith(['c1'], 'space-from-request');
      expect(result).toEqual(new Map([['c1', ['host-1']]]));
    });

    it('should map each conversation to its entity ids and omit conversations without impact', async () => {
      const { client } = createClient({
        listByConversationIds: jest.fn().mockResolvedValue([impact('c1', 'host-1', 'user-1')]),
      });

      const result = await client.getEntityIdsByConversationId(['c1', 'c2']);

      expect(result).toEqual(new Map([['c1', ['host-1', 'user-1']]]));
    });

    it('should map an impact recorded without entities to no entity ids', async () => {
      const { client } = createClient({
        listByConversationIds: jest
          .fn()
          .mockResolvedValue([{ conversationId: 'c1', summary: 'Checkout failed' }]),
      });

      expect(await client.getEntityIdsByConversationId(['c1'])).toEqual(new Map([['c1', []]]));
    });

    it('should dedupe the ids and read in chunks of the per-read cap', async () => {
      const ids = Array.from({ length: MAX_IMPACT_CONVERSATION_IDS + 5 }, (_, i) => `c${i}`);
      const { client, listByConversationIds } = createClient();

      await client.getEntityIdsByConversationId([...ids, ...ids]);

      expect(listByConversationIds).toHaveBeenCalledTimes(2);
      expect(listByConversationIds.mock.calls[0][0]).toHaveLength(MAX_IMPACT_CONVERSATION_IDS);
      expect(listByConversationIds.mock.calls[1][0]).toHaveLength(5);
    });

    it('should not read when there are no ids', async () => {
      const { client, listByConversationIds } = createClient();

      expect(await client.getEntityIdsByConversationId([])).toEqual(new Map());
      expect(listByConversationIds).not.toHaveBeenCalled();
    });

    it('should refuse when the principal cannot manage investigations', async () => {
      const { client } = createClient({
        assertCanRead: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope')),
      });

      await expect(client.getEntityIdsByConversationId(['c1'])).rejects.toBeInstanceOf(
        InvestigationsForbiddenError
      );
    });
  });
});
