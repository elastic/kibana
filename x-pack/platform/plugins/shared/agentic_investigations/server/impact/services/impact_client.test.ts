/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ImpactPrivilegesChecker } from './check_impact_privileges';
import { MAX_IMPACT_CONVERSATION_IDS } from '../../../common/impact/constants';
import { ImpactForbiddenError } from './errors';
import { createImpactClient } from './impact_client';
import type { ImpactService } from './impact_service';

const request = httpServerMock.createKibanaRequest();

const createClient = ({
  listByConversationIds = jest.fn().mockResolvedValue([]),
  assertCanRead = jest.fn().mockResolvedValue(undefined),
  getSpaceId = jest.fn().mockReturnValue('space-from-request'),
}: {
  listByConversationIds?: jest.Mock;
  assertCanRead?: jest.Mock;
  getSpaceId?: jest.Mock;
} = {}) => {
  const privileges: ImpactPrivilegesChecker = {
    assertCanRead,
    assertCanManage: jest.fn(),
  };
  const client = createImpactClient({
    getImpactService: () => ({ listByConversationIds } as unknown as ImpactService),
    getSpaceId,
    privileges,
  })(request);

  return { client, listByConversationIds, assertCanRead, getSpaceId };
};

describe('createImpactClient', () => {
  it('should read in the request space after the privilege check', async () => {
    const { client, listByConversationIds, assertCanRead, getSpaceId } = createClient();

    await client.listByConversationIds(['c1', 'c2']);

    expect(assertCanRead).toHaveBeenCalledWith(request);
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(listByConversationIds).toHaveBeenCalledWith(['c1', 'c2'], 'space-from-request');
  });

  it('should refuse before searching when the principal cannot manage investigations', async () => {
    const { client, listByConversationIds, getSpaceId } = createClient({
      assertCanRead: jest.fn().mockRejectedValue(new ImpactForbiddenError('nope')),
    });

    await expect(client.listByConversationIds(['c1'])).rejects.toBeInstanceOf(ImpactForbiddenError);
    expect(listByConversationIds).not.toHaveBeenCalled();
    expect(getSpaceId).not.toHaveBeenCalled();
  });

  describe('getEntityIdsByConversationId', () => {
    const impact = (conversationId: string, ...ids: string[]) => ({
      conversationId,
      entities: ids.map((id) => ({ id })),
    });

    it('should map each conversation to its entity ids and omit conversations without impact', async () => {
      const { client } = createClient({
        listByConversationIds: jest.fn().mockResolvedValue([impact('c1', 'host-1', 'user-1')]),
      });

      const result = await client.getEntityIdsByConversationId(['c1', 'c2']);

      expect(result).toEqual(new Map([['c1', ['host-1', 'user-1']]]));
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
        assertCanRead: jest.fn().mockRejectedValue(new ImpactForbiddenError('nope')),
      });

      await expect(client.getEntityIdsByConversationId(['c1'])).rejects.toBeInstanceOf(
        ImpactForbiddenError
      );
    });
  });
});
