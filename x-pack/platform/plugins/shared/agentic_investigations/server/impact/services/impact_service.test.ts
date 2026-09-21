/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ENTITY_IDS, MAX_IMPACT_CONVERSATION_IDS } from '../../../common/impact/constants';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';
import { ImpactInvalidRequestError, ImpactNotFoundError } from './errors';
import { ImpactService } from './impact_service';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';

const analyst = {
  username: 'analyst',
  fullName: null,
  email: null,
  profileUid: 'analyst-uid',
};

const baseDocument = (overrides: Partial<ImpactDocument> = {}): ImpactDocument => ({
  spaceId: SPACE_ID,
  conversationId: CONVERSATION_ID,
  entities: [{ id: 'user-1' }],
  createdAt: '2026-09-01T00:00:00.000Z',
  createdBy: analyst,
  ...overrides,
});

const searchHit = (document: ImpactDocument, id = 'impact-1') => ({
  _id: id,
  _source: document,
});

const createStorage = (document?: ImpactDocument) => {
  const hits = document ? [searchHit(document)] : [];
  return {
    index: jest.fn().mockResolvedValue({ _id: document ? 'impact-1' : 'impact-new' }),
    search: jest.fn().mockResolvedValue({
      hits: { hits, total: { value: hits.length } },
    }),
  } as unknown as jest.Mocked<ImpactStorageClient> & {
    index: jest.Mock;
    search: jest.Mock;
  };
};

const createService = (storage: ReturnType<typeof createStorage>) => new ImpactService({ storage });

describe('ImpactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('attach', () => {
    it('creates one document when the conversation has no impact yet', async () => {
      const storage = createStorage();
      const service = createService(storage);

      const impact = await service.attach(
        { conversationId: CONVERSATION_ID, entities: [{ id: 'user-1' }, { id: 'host-1' }] },
        { spaceId: SPACE_ID, user: analyst }
      );

      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          op_type: 'create',
          document: expect.objectContaining({
            spaceId: SPACE_ID,
            conversationId: CONVERSATION_ID,
            entities: [{ id: 'user-1' }, { id: 'host-1' }],
            createdBy: analyst,
          }),
        })
      );
      expect(impact.entities).toEqual([{ id: 'user-1' }, { id: 'host-1' }]);
      expect(impact.id).toEqual(expect.any(String));
    });

    it('unions entities onto the existing document and fills fields a later attach adds', async () => {
      const storage = createStorage(
        baseDocument({ entities: [{ id: 'checkout-api', name: 'checkout-api' }] })
      );
      const service = createService(storage);

      const impact = await service.attach(
        {
          conversationId: CONVERSATION_ID,
          entities: [
            { id: 'host-1' },
            {
              id: 'checkout-api',
              type: 'service',
              featureId: 'feat-checkout',
              streamName: 'logs.checkout-api',
            },
          ],
        },
        { spaceId: SPACE_ID, user: analyst }
      );

      expect(storage.index).toHaveBeenCalledWith({
        id: 'impact-1',
        document: expect.objectContaining({
          entities: [
            {
              id: 'checkout-api',
              name: 'checkout-api',
              type: 'service',
              featureId: 'feat-checkout',
              streamName: 'logs.checkout-api',
            },
            { id: 'host-1' },
          ],
          createdAt: '2026-09-01T00:00:00.000Z',
          createdBy: analyst,
        }),
      });
      expect(storage.index.mock.calls[0][0]).not.toHaveProperty('op_type');
      expect(impact.id).toBe('impact-1');
      expect(impact.entities).toEqual([
        {
          id: 'checkout-api',
          name: 'checkout-api',
          type: 'service',
          featureId: 'feat-checkout',
          streamName: 'logs.checkout-api',
        },
        { id: 'host-1' },
      ]);
    });

    it('refuses a merge that would exceed the entity id ceiling', async () => {
      const existing = Array.from({ length: MAX_ENTITY_IDS }, (_, i) => ({ id: `entity-${i}` }));
      const storage = createStorage(baseDocument({ entities: existing }));
      const service = createService(storage);

      await expect(
        service.attach(
          { conversationId: CONVERSATION_ID, entities: [{ id: 'extra' }] },
          { spaceId: SPACE_ID }
        )
      ).rejects.toBeInstanceOf(ImpactInvalidRequestError);
      expect(storage.index).not.toHaveBeenCalled();
    });
  });

  describe('getByConversationId', () => {
    it('returns the document for the conversation in the caller space', async () => {
      const storage = createStorage(baseDocument());
      const service = createService(storage);

      const impact = await service.getByConversationId(CONVERSATION_ID, SPACE_ID);

      expect(impact).toEqual({ id: 'impact-1', ...baseDocument() });
      expect(storage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { term: { spaceId: SPACE_ID } },
                { term: { conversationId: CONVERSATION_ID } },
              ],
            },
          },
        })
      );
    });

    it('throws when the conversation has no impact', async () => {
      const storage = createStorage();
      const service = createService(storage);

      await expect(service.getByConversationId(CONVERSATION_ID, SPACE_ID)).rejects.toBeInstanceOf(
        ImpactNotFoundError
      );
    });
  });

  describe('listByConversationIds', () => {
    it('returns one document per conversation and omits missing ones', async () => {
      const first = baseDocument();
      const second = baseDocument({ conversationId: 'conv-2', entities: [{ id: 'host-9' }] });
      const storage = createStorage();
      storage.search.mockResolvedValue({
        hits: { hits: [searchHit(first, 'impact-1'), searchHit(second, 'impact-2')] },
      });
      const service = createService(storage);

      const impacts = await service.listByConversationIds(
        [CONVERSATION_ID, 'conv-2', 'conv-missing'],
        SPACE_ID
      );

      expect(impacts).toEqual([
        { id: 'impact-1', ...first },
        { id: 'impact-2', ...second },
      ]);
      expect(storage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 3,
          query: {
            bool: {
              filter: [
                { term: { spaceId: SPACE_ID } },
                { terms: { conversationId: [CONVERSATION_ID, 'conv-2', 'conv-missing'] } },
              ],
            },
          },
        })
      );
    });

    it('returns an empty array without hitting storage when asked for nothing', async () => {
      const storage = createStorage();
      const service = createService(storage);

      await expect(service.listByConversationIds([], SPACE_ID)).resolves.toEqual([]);
      expect(storage.search).not.toHaveBeenCalled();
    });

    it('refuses an unbounded conversation id list', async () => {
      const storage = createStorage();
      const service = createService(storage);
      const ids = Array.from({ length: MAX_IMPACT_CONVERSATION_IDS + 1 }, (_, i) => `conv-${i}`);

      await expect(service.listByConversationIds(ids, SPACE_ID)).rejects.toBeInstanceOf(
        ImpactInvalidRequestError
      );
      expect(storage.search).not.toHaveBeenCalled();
    });
  });
});
