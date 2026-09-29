/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ENTITY_IDS,
  MAX_IMPACT_CONVERSATION_IDS,
  MAX_IMPACT_ID_LENGTH,
} from '../../../common/impact/constants';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';
import { ImpactConflictError, ImpactInvalidRequestError, ImpactNotFoundError } from './errors';
import { impactDocumentId, ImpactService } from './impact_service';

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

const documentId = (document: ImpactDocument) =>
  impactDocumentId(document.spaceId, document.conversationId);

const searchHit = (document: ImpactDocument, id = documentId(document)) => ({
  _id: id,
  _source: document,
});

const versionedSearchResponse = (hit: ReturnType<typeof versionedHit> | undefined) => ({
  hits: { hits: hit ? [hit] : [], total: { value: hit ? 1 : 0 } },
});

const versionedHit = (document: ImpactDocument, seqNo = 3, primaryTerm = 1) => ({
  _id: documentId(document),
  _source: document,
  _seq_no: seqNo,
  _primary_term: primaryTerm,
});

const conflictError = () => Object.assign(new Error('conflict'), { statusCode: 409 });

const createStorage = (document?: ImpactDocument) => {
  return {
    index: jest.fn().mockResolvedValue({ _id: document ? documentId(document) : 'impact-new' }),
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue({ acknowledged: true, result: 'deleted' }),
    search: jest
      .fn()
      .mockResolvedValue(versionedSearchResponse(document ? versionedHit(document) : undefined)),
  } as unknown as jest.Mocked<ImpactStorageClient> & {
    index: jest.Mock;
    get: jest.Mock;
    delete: jest.Mock;
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

      const { written: impact, previous } = await service.attach(
        { conversationId: CONVERSATION_ID, entities: [{ id: 'user-1' }, { id: 'host-1' }] },
        { spaceId: SPACE_ID, user: analyst }
      );

      const id = impactDocumentId(SPACE_ID, CONVERSATION_ID);
      expect(storage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          seq_no_primary_term: true,
          query: { bool: { filter: [{ term: { _id: id } }] } },
        })
      );
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
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
      expect(impact.id).toBe(id);
      expect(previous).toBeUndefined();
      expect(impactDocumentId('other-space', CONVERSATION_ID)).not.toBe(id);
    });

    it('unions entities onto the existing document and fills fields a later attach adds', async () => {
      const existing = baseDocument({ entities: [{ id: 'checkout-api', name: 'checkout-api' }] });
      const storage = createStorage(existing);
      const service = createService(storage);

      const { written: impact, previous } = await service.attach(
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
        id: impactDocumentId(SPACE_ID, CONVERSATION_ID),
        if_seq_no: 3,
        if_primary_term: 1,
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
      expect(impact.id).toBe(impactDocumentId(SPACE_ID, CONVERSATION_ID));
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
      expect(previous).toEqual({ id: impact.id, ...existing });
    });

    it('refuses a create that exceeds the entity id ceiling', async () => {
      const storage = createStorage();
      const service = createService(storage);
      const entities = Array.from({ length: MAX_ENTITY_IDS + 1 }, (_, i) => ({
        id: `entity-${i}`,
      }));

      await expect(
        service.attach({ conversationId: CONVERSATION_ID, entities }, { spaceId: SPACE_ID })
      ).rejects.toBeInstanceOf(ImpactInvalidRequestError);
      expect(storage.search).not.toHaveBeenCalled();
      expect(storage.index).not.toHaveBeenCalled();
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

    it('retries a lost create and unions onto the document the other writer created', async () => {
      const storage = createStorage();
      const winner = baseDocument({ entities: [{ id: 'service-1' }] });
      storage.search
        .mockResolvedValueOnce(versionedSearchResponse(undefined))
        .mockResolvedValueOnce(versionedSearchResponse(versionedHit(winner, 1)));
      storage.index.mockRejectedValueOnce(conflictError()).mockResolvedValueOnce({});
      const service = createService(storage);

      const { written: impact, previous } = await service.attach(
        { conversationId: CONVERSATION_ID, entities: [{ id: 'host-1' }] },
        { spaceId: SPACE_ID, user: analyst }
      );

      expect(storage.index).toHaveBeenCalledTimes(2);
      expect(storage.index.mock.calls[0][0]).toEqual(
        expect.objectContaining({ op_type: 'create' })
      );
      expect(storage.index.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          id: impactDocumentId(SPACE_ID, CONVERSATION_ID),
          if_seq_no: 1,
          if_primary_term: 1,
          document: expect.objectContaining({
            entities: [{ id: 'service-1' }, { id: 'host-1' }],
            createdAt: winner.createdAt,
            createdBy: analyst,
          }),
        })
      );
      expect(impact.entities).toEqual([{ id: 'service-1' }, { id: 'host-1' }]);
      expect(previous).toEqual({ id: impact.id, ...winner });
    });

    it('retries a lost update and keeps entities both writers added', async () => {
      const storage = createStorage(baseDocument({ entities: [{ id: 'user-1' }] }));
      storage.search
        .mockResolvedValueOnce(
          versionedSearchResponse(versionedHit(baseDocument({ entities: [{ id: 'user-1' }] }), 3))
        )
        .mockResolvedValueOnce(
          versionedSearchResponse(
            versionedHit(baseDocument({ entities: [{ id: 'user-1' }, { id: 'service-1' }] }), 4)
          )
        );
      storage.index.mockRejectedValueOnce(conflictError()).mockResolvedValueOnce({});
      const service = createService(storage);

      const { written: impact, previous } = await service.attach(
        { conversationId: CONVERSATION_ID, entities: [{ id: 'host-1' }] },
        { spaceId: SPACE_ID }
      );

      expect(storage.index.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          if_seq_no: 4,
          document: expect.objectContaining({
            entities: [{ id: 'user-1' }, { id: 'service-1' }, { id: 'host-1' }],
          }),
        })
      );
      expect(impact.entities).toEqual([{ id: 'user-1' }, { id: 'service-1' }, { id: 'host-1' }]);
      expect(previous).toEqual({
        id: impact.id,
        ...baseDocument({ entities: [{ id: 'user-1' }, { id: 'service-1' }] }),
      });
    });

    it('gives up when every attempt loses the version check', async () => {
      const storage = createStorage();
      storage.index.mockRejectedValue(conflictError());
      const service = createService(storage);

      await expect(
        service.attach(
          { conversationId: CONVERSATION_ID, entities: [{ id: 'host-1' }] },
          { spaceId: SPACE_ID }
        )
      ).rejects.toBeInstanceOf(ImpactConflictError);
      expect(storage.index).toHaveBeenCalledTimes(3);
    });
  });

  describe('getByConversationId', () => {
    it('returns the document for the conversation in the caller space', async () => {
      const storage = createStorage(baseDocument());
      const service = createService(storage);

      const impact = await service.getByConversationId(CONVERSATION_ID, SPACE_ID);

      expect(impact).toEqual({
        id: impactDocumentId(SPACE_ID, CONVERSATION_ID),
        ...baseDocument(),
      });
      expect(storage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          seq_no_primary_term: true,
          query: {
            bool: {
              filter: [{ term: { _id: impactDocumentId(SPACE_ID, CONVERSATION_ID) } }],
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

  describe('get', () => {
    it('returns the document by id in the caller space', async () => {
      const storage = createStorage(baseDocument());
      const service = createService(storage);
      const id = impactDocumentId(SPACE_ID, CONVERSATION_ID);

      const impact = await service.get(id, SPACE_ID);

      expect(impact).toEqual({ id, ...baseDocument() });
      expect(storage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          seq_no_primary_term: true,
          query: {
            bool: {
              filter: [{ term: { _id: id } }],
            },
          },
        })
      );
    });

    it('throws when the id is missing in the caller space', async () => {
      const storage = createStorage();
      const service = createService(storage);

      await expect(service.get('impact-missing', SPACE_ID)).rejects.toBeInstanceOf(
        ImpactNotFoundError
      );
    });

    it('throws when the document belongs to another space', async () => {
      const storage = createStorage(baseDocument());
      const service = createService(storage);

      await expect(
        service.get(impactDocumentId(SPACE_ID, CONVERSATION_ID), 'other-space')
      ).rejects.toBeInstanceOf(ImpactNotFoundError);
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

    it('refuses a conversation id longer than the id bound', async () => {
      const storage = createStorage();
      const service = createService(storage);

      await expect(
        service.listByConversationIds(['a'.repeat(MAX_IMPACT_ID_LENGTH + 1)], SPACE_ID)
      ).rejects.toBeInstanceOf(ImpactInvalidRequestError);
      expect(storage.search).not.toHaveBeenCalled();
    });

    it('refuses an empty conversation id', async () => {
      const storage = createStorage();
      const service = createService(storage);

      await expect(service.listByConversationIds([''], SPACE_ID)).rejects.toBeInstanceOf(
        ImpactInvalidRequestError
      );
      expect(storage.search).not.toHaveBeenCalled();
    });

    it('refuses a space id longer than the id bound', async () => {
      const storage = createStorage();
      const service = createService(storage);

      await expect(
        service.listByConversationIds([CONVERSATION_ID], 's'.repeat(MAX_IMPACT_ID_LENGTH + 1))
      ).rejects.toBeInstanceOf(ImpactInvalidRequestError);
      expect(storage.search).not.toHaveBeenCalled();
    });
  });

  describe('revertAttach', () => {
    const written = () => ({ id: documentId(baseDocument()), ...baseDocument() });

    it('deletes an impact this attach created when the attachment write did not land', async () => {
      const storage = createStorage(baseDocument());
      const service = createService(storage);
      const impact = written();

      await service.revertAttach({ written: impact });

      expect(storage.delete).toHaveBeenCalledWith({
        id: impact.id,
        if_seq_no: 3,
        if_primary_term: 1,
      });
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('restores the previous entity set when a merge was not attached to the conversation', async () => {
      const previous = written();
      const merged = baseDocument({ entities: [{ id: 'user-1' }, { id: 'host-1' }] });
      const storage = createStorage(merged);
      const service = createService(storage);

      await service.revertAttach({
        written: { id: documentId(merged), ...merged },
        previous,
      });

      expect(storage.delete).not.toHaveBeenCalled();
      expect(storage.index).toHaveBeenCalledWith({
        id: documentId(merged),
        document: baseDocument(),
        if_seq_no: 3,
        if_primary_term: 1,
      });
    });

    it('leaves the document when a later write already changed it', async () => {
      const storage = createStorage(baseDocument({ entities: [{ id: 'other' }] }));
      const service = createService(storage);

      await service.revertAttach({ written: written() });

      expect(storage.delete).not.toHaveBeenCalled();
      expect(storage.index).not.toHaveBeenCalled();
    });
  });
});
