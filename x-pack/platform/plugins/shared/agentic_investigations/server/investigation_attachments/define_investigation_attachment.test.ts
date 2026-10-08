/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  createAttachmentAlreadyExistsError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type {
  AgentBuilderPluginSetup,
  AttachmentPublicClient,
  ConversationPublicClient,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { types } from '@kbn/storage-adapter';
import { defineInvestigationAttachment } from './define_investigation_attachment';
import { hashInvestigationAttachmentId } from './doc_id';
import {
  InvestigationAttachmentConflictError,
  InvestigationAttachmentInvalidRequestError,
} from './errors';
import { createInMemoryStorage } from './in_memory_storage.mock';
import { hypothesesAttachment } from '../hypotheses/attachments/hypotheses_attachment_type';
import { impactAttachment } from '../impact/attachments/impact_attachment_type';
import { subjectAttachment } from '../subjects/attachments/subject_attachment_type';

const TYPE = 'investigation_note';
const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';

interface NoteDocument {
  spaceId: string;
  conversationId: string;
  text: string;
  count: number;
  updatedAt?: string;
}

const noteSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  conversationId: z.string(),
  text: z.string().max(20),
  count: z.number(),
  updatedAt: z.string().optional(),
});

const storageSettings = {
  name: '.kibana-investigation-note',
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      text: types.text({}),
      count: types.long({}),
      updatedAt: types.date({}),
    },
  },
};

const note = defineInvestigationAttachment<typeof TYPE, typeof storageSettings, NoteDocument>({
  type: TYPE,
  storageSettings,
  schema: noteSchema,
  format: (document) => `Note: ${document.text} (${document.count})`,
  agentDescription: 'A note.',
  describe: (document) => `Note ${document.count}`,
});

const hiddenNote = defineInvestigationAttachment<typeof TYPE, typeof storageSettings, NoteDocument>(
  {
    type: TYPE,
    storageSettings,
    schema: noteSchema,
    format: (document) => `Note: ${document.text} (${document.count})`,
    agentDescription: 'A note.',
    hiddenInConversation: true,
  }
);

const noteId = (conversationId = CONVERSATION_ID, spaceId = SPACE_ID) =>
  note.documentId(spaceId, conversationId);

const body = (overrides: Partial<NoteDocument> = {}): NoteDocument => ({
  spaceId: SPACE_ID,
  conversationId: CONVERSATION_ID,
  text: 'hello',
  count: 1,
  ...overrides,
});

const setup = () => {
  const storage = createInMemoryStorage<NoteDocument>();
  const service = note.createServiceFromStorage(storage);
  return { storage, service };
};

const registeredType = (
  service: ReturnType<typeof setup>['service'],
  assertCanRead: jest.Mock = jest.fn().mockResolvedValue(undefined),
  assertCanReadConversation: jest.Mock = jest.fn().mockResolvedValue(undefined)
) => {
  const registerType = jest.fn();
  note.registerAttachmentType(
    { attachments: { registerType } } as unknown as AgentBuilderPluginSetup,
    {
      getService: () => service,
      assertCanRead,
      assertCanReadConversation,
      logger: loggerMock.create(),
    }
  );
  return registerType.mock.calls[0][0] as AttachmentTypeDefinition;
};

const resolveContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: SPACE_ID,
  savedObjectsClient: {} as SavedObjectsClientContract,
};

describe('hashInvestigationAttachmentId', () => {
  it('keeps length-prefixed parts apart', () => {
    expect(hashInvestigationAttachmentId('a:b', 'c')).not.toBe(
      hashInvestigationAttachmentId('a', 'b:c')
    );
    expect(hashInvestigationAttachmentId('s', 'c')).toBe(hashInvestigationAttachmentId('s', 'c'));
  });
});

describe('documentId', () => {
  const otherType = defineInvestigationAttachment<
    'investigation_other_note',
    typeof storageSettings,
    NoteDocument
  >({
    type: 'investigation_other_note',
    storageSettings,
    schema: noteSchema,
    format: (document) => document.text,
    agentDescription: 'Another note.',
  });

  it('puts the type into the id, so two types of one conversation get different attachment ids', () => {
    expect(note.documentId(SPACE_ID, CONVERSATION_ID)).toBe(
      hashInvestigationAttachmentId(TYPE, SPACE_ID, CONVERSATION_ID)
    );
    expect(note.documentId(SPACE_ID, CONVERSATION_ID)).not.toBe(
      otherType.documentId(SPACE_ID, CONVERSATION_ID)
    );
  });

  it('tells documents of one conversation apart by their key parts', () => {
    expect(note.documentId(SPACE_ID, CONVERSATION_ID, 'alert', 'a-1')).not.toBe(
      note.documentId(SPACE_ID, CONVERSATION_ID, 'alert', 'a-2')
    );
  });

  it('leaves the type out for an index with legacy untyped ids', () => {
    const legacy = defineInvestigationAttachment<typeof TYPE, typeof storageSettings, NoteDocument>(
      {
        type: TYPE,
        storageSettings,
        schema: noteSchema,
        format: (document) => document.text,
        agentDescription: 'A legacy note.',
        legacyUntypedDocumentIds: true,
      }
    );
    expect(legacy.documentId(SPACE_ID, CONVERSATION_ID)).toBe(
      hashInvestigationAttachmentId(SPACE_ID, CONVERSATION_ID)
    );
  });

  it('never gives the investigation attachment types of one conversation the same id', () => {
    const ids = [
      impactAttachment.documentId(SPACE_ID, CONVERSATION_ID),
      hypothesesAttachment.documentId(SPACE_ID, CONVERSATION_ID),
      subjectAttachment.documentId(SPACE_ID, CONVERSATION_ID, 'manual', CONVERSATION_ID),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    // Impact documents predate the factory; their ids must not change.
    expect(impactAttachment.documentId(SPACE_ID, CONVERSATION_ID)).toBe(
      hashInvestigationAttachmentId(SPACE_ID, CONVERSATION_ID)
    );
  });
});

describe('InvestigationAttachmentDocService', () => {
  it('creates the document, then updates it under its version', async () => {
    const { storage, service } = setup();

    const created = await service.upsert({ id: noteId(), mutate: () => body() });
    expect(created).toEqual({ written: { id: noteId(), ...body() } });
    expect(storage.index).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: noteId(), op_type: 'create' })
    );

    const updated = await service.upsert({
      id: noteId(),
      mutate: (current) => body({ count: (current?.count ?? 0) + 1 }),
    });
    expect(updated.written.count).toBe(2);
    expect(updated.previous).toEqual({ id: noteId(), ...body() });
    expect(storage.index).toHaveBeenLastCalledWith(
      expect.objectContaining({ if_seq_no: 1, if_primary_term: 1 })
    );
  });

  it('re-reads and mutates again when a concurrent writer wins the version check', async () => {
    const { storage, service } = setup();
    storage.put(noteId(), body({ count: 1 }));
    let calls = 0;

    const { written } = await service.upsert({
      id: noteId(),
      mutate: (current) => {
        calls++;
        if (calls === 1) {
          // Another writer lands between this read and the write.
          storage.put(noteId(), body({ count: 10 }));
        }
        return body({ count: (current?.count ?? 0) + 1 });
      },
    });

    expect(calls).toBe(2);
    expect(written.count).toBe(11);
  });

  it('gives up with a conflict error when every attempt loses', async () => {
    const { storage, service } = setup();
    storage.put(noteId(), body());

    await expect(
      service.upsert({
        id: noteId(),
        mutate: (current) => {
          storage.put(noteId(), body({ count: (current?.count ?? 0) + 1 }));
          return body();
        },
      })
    ).rejects.toBeInstanceOf(InvestigationAttachmentConflictError);
    expect(storage.index).toHaveBeenCalledTimes(3);
  });

  it('hides documents of another space', async () => {
    const { storage, service } = setup();
    storage.put(noteId(), body());

    await expect(service.get(noteId(), SPACE_ID)).resolves.toEqual({ id: noteId(), ...body() });
    await expect(service.get(noteId(), 'other')).resolves.toBeUndefined();
    await expect(service.get('', SPACE_ID)).resolves.toBeUndefined();
  });

  it('reverts a created document by deleting it', async () => {
    const { storage, service } = setup();
    const written = await service.upsert({ id: noteId(), mutate: () => body() });

    await service.revert(written);

    expect(storage.entries.has(noteId())).toBe(false);
  });

  it('reverts an overwrite to the previous body', async () => {
    const { storage, service } = setup();
    storage.put(noteId(), body({ count: 1 }));
    const written = await service.upsert({ id: noteId(), mutate: () => body({ count: 2 }) });

    await service.revert(written);

    expect(storage.entries.get(noteId())?.source).toEqual(body({ count: 1 }));
  });

  it('does not revert once a later write changed the document', async () => {
    const { storage, service } = setup();
    const written = await service.upsert({ id: noteId(), mutate: () => body() });
    storage.put(noteId(), body({ count: 5 }));

    await service.revert(written);

    expect(storage.entries.get(noteId())?.source).toEqual(body({ count: 5 }));
  });

  it('lists documents by conversation within the space', async () => {
    const { storage, service } = setup();
    storage.put(noteId('conv-1'), body({ conversationId: 'conv-1' }));
    storage.put(noteId('conv-2'), body({ conversationId: 'conv-2' }));
    storage.put(noteId('conv-1', 'other'), body({ conversationId: 'conv-1', spaceId: 'other' }));

    const documents = await service.listByConversationIds(['conv-1', 'conv-2', 'conv-3'], SPACE_ID);

    expect(documents.map(({ conversationId }) => conversationId).sort()).toEqual([
      'conv-1',
      'conv-2',
    ]);
    await expect(service.listByConversationIds([], SPACE_ID)).resolves.toEqual([]);
  });

  it('refuses unbounded conversation id lists', async () => {
    const { service } = setup();
    const ids = Array.from({ length: 1001 }, (_, index) => `conv-${index}`);

    await expect(service.listByConversationIds(ids, SPACE_ID)).rejects.toBeInstanceOf(
      InvestigationAttachmentInvalidRequestError
    );
    // Candidate searches may return up to Elasticsearch's result window of conversations.
    await expect(
      service.searchConversationIds({ spaceId: SPACE_ID, filter: [], size: 10_001 })
    ).rejects.toBeInstanceOf(InvestigationAttachmentInvalidRequestError);
  });

  it('returns unique candidate conversation ids for a filter', async () => {
    const { storage, service } = setup();
    storage.put('a', body({ conversationId: 'conv-1', text: 'x' }));
    storage.put('b', body({ conversationId: 'conv-1', text: 'x' }));
    storage.put('c', body({ conversationId: 'conv-2', text: 'y' }));
    storage.put('d', body({ conversationId: 'conv-3', text: 'x', spaceId: 'other' }));

    await expect(
      service.searchConversationIds({ spaceId: SPACE_ID, filter: [{ term: { text: 'x' } }] })
    ).resolves.toEqual(['conv-1']);
  });

  it('reads a missing index as empty', async () => {
    const { storage, service } = setup();
    jest.mocked(storage.search).mockRejectedValue(
      Object.assign(new Error('no such index'), {
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
      })
    );

    await expect(service.get(noteId(), SPACE_ID)).resolves.toBeUndefined();
    await expect(service.listByConversationIds(['conv-1'], SPACE_ID)).resolves.toEqual([]);
    await expect(service.searchConversationIds({ spaceId: SPACE_ID, filter: [] })).resolves.toEqual(
      []
    );
  });

  it('retries a read while the new index has no available shard', async () => {
    jest.useFakeTimers();
    try {
      const { storage, service } = setup();
      storage.put(noteId(), body());
      jest.mocked(storage.search).mockRejectedValueOnce(
        Object.assign(new Error('all shards failed'), {
          statusCode: 503,
          body: {
            error: {
              type: 'search_phase_execution_exception',
              root_cause: [{ type: 'no_shard_available_action_exception' }],
            },
          },
        })
      );

      const documents = service.listByConversationIds([CONVERSATION_ID], SPACE_ID);
      await jest.advanceTimersByTimeAsync(200);

      await expect(documents).resolves.toEqual([{ ...body(), id: noteId() }]);
      expect(storage.search).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('finds the conversations holding documents across spaces, once each', async () => {
    const { storage, service } = setup();
    storage.put('a', body({ conversationId: 'conv-1' }));
    storage.put('b', body({ conversationId: 'conv-1' }));
    storage.put('c', body({ conversationId: 'conv-1', spaceId: 'other' }));

    await expect(service.findConversationsAcrossSpaces()).resolves.toEqual([
      { spaceId: SPACE_ID, conversationId: 'conv-1' },
      { spaceId: 'other', conversationId: 'conv-1' },
    ]);
  });

  it('deletes by conversation and by space for maintenance', async () => {
    const { storage, service } = setup();
    storage.put('a', body({ conversationId: 'conv-1' }));
    storage.put('b', body({ conversationId: 'conv-2' }));
    storage.put('c', body({ conversationId: 'conv-3' }));
    storage.put('d', body({ conversationId: 'conv-1', spaceId: 'other' }));

    await expect(service.deleteByConversationIds(['conv-1'], SPACE_ID)).resolves.toBe(1);
    expect([...storage.entries.keys()].sort()).toEqual(['b', 'c', 'd']);

    await expect(service.deleteAllInSpace(SPACE_ID)).resolves.toBe(2);
    expect([...storage.entries.keys()]).toEqual(['d']);
  });
});

describe('investigation attachment type', () => {
  it('is readonly and validates the stored document shape', async () => {
    const { service } = setup();
    const definition = registeredType(service);

    expect(definition.id).toBe(TYPE);
    expect(definition.isReadonly).toBe(true);
    expect(await definition.validate({ id: 'x', ...body() })).toEqual({
      valid: true,
      data: { id: 'x', ...body() },
    });
    expect(await definition.validate({ id: 'x', ...body({ text: 'x'.repeat(21) }) })).toMatchObject(
      { valid: false }
    );
  });

  it('resolves an origin from the index of the caller space', async () => {
    const { storage, service } = setup();
    storage.put(noteId(), body());
    const definition = registeredType(service);

    await expect(definition.resolve?.(noteId(), resolveContext)).resolves.toEqual({
      id: noteId(),
      ...body(),
    });
    await expect(
      definition.resolve?.(noteId(), { ...resolveContext, spaceId: 'other' })
    ).resolves.toBeUndefined();
  });

  it('resolves and checks staleness only for a caller who may read the entity', async () => {
    const { storage, service } = setup();
    storage.put(noteId(), body());
    const assertCanRead = jest.fn().mockRejectedValue(new Error('Missing privilege'));
    const definition = registeredType(service, assertCanRead);

    await expect(definition.resolve?.(noteId(), resolveContext)).resolves.toBeUndefined();
    await expect(
      definition.isStale?.(
        {
          id: noteId(),
          type: TYPE,
          origin: noteId(),
          current_version: 1,
          active: true,
          versions: [
            {
              version: 1,
              data: { id: noteId(), ...body({ count: 9 }) },
              created_at: '',
              content_hash: '',
              estimated_tokens: 1,
            },
          ],
        },
        resolveContext
      )
    ).resolves.toBe(false);
    expect(assertCanRead).toHaveBeenCalledWith(resolveContext.request);
    expect(storage.search).not.toHaveBeenCalled();
  });

  it('resolves and checks staleness only for a caller who can read the document conversation', async () => {
    const { storage, service } = setup();
    storage.put(noteId(), body());
    const assertCanReadConversation = jest
      .fn()
      .mockRejectedValue(new Error('Conversation is not readable'));
    const definition = registeredType(
      service,
      jest.fn().mockResolvedValue(undefined),
      assertCanReadConversation
    );

    await expect(definition.resolve?.(noteId(), resolveContext)).resolves.toBeUndefined();
    await expect(
      definition.isStale?.(
        {
          id: noteId(),
          type: TYPE,
          origin: noteId(),
          current_version: 1,
          active: true,
          versions: [
            {
              version: 1,
              data: { id: noteId(), ...body({ count: 9 }) },
              created_at: '',
              content_hash: '',
              estimated_tokens: 1,
            },
          ],
        },
        resolveContext
      )
    ).resolves.toBe(false);
    expect(assertCanReadConversation).toHaveBeenCalledWith(
      resolveContext.request,
      body().conversationId
    );
  });

  it('is stale when the index changed beyond a timestamp', async () => {
    const { storage, service } = setup();
    const definition = registeredType(service);
    const attachment = (data: object): VersionedAttachment & { origin: string } => ({
      id: noteId(),
      type: TYPE,
      origin: noteId(),
      current_version: 1,
      active: true,
      versions: [{ version: 1, data, created_at: '', content_hash: '', estimated_tokens: 1 }],
    });

    storage.put(noteId(), body({ updatedAt: '2026-01-02T00:00:00.000Z' }));
    await expect(
      definition.isStale?.(
        attachment({ id: noteId(), ...body({ updatedAt: '2026-01-01T00:00:00.000Z' }) }),
        resolveContext
      )
    ).resolves.toBe(false);

    storage.put(noteId(), body({ count: 2 }));
    await expect(
      definition.isStale?.(attachment({ id: noteId(), ...body() }), resolveContext)
    ).resolves.toBe(true);
  });

  it('formats the document for the agent', async () => {
    const { service } = setup();
    const definition = registeredType(service);
    const formatted = await definition.format(
      { id: noteId(), type: TYPE, data: { id: noteId(), ...body() } },
      { request: resolveContext.request, spaceId: SPACE_ID }
    );

    expect(await formatted.getRepresentation?.()).toEqual({
      type: 'text',
      value: 'Note: hello (1)',
    });
  });
});

describe('writeAndAttach', () => {
  const owner = () =>
    ({
      get: jest.fn().mockResolvedValue({ permissions: { update_access_control: true } }),
    } as unknown as ConversationPublicClient);

  it('writes the index after confirming the conversation is readable, then creates the by-reference attachment', async () => {
    const { storage, service } = setup();
    const create = jest.fn().mockResolvedValue({ id: noteId() });

    const document = await note.writeAndAttach({
      service,
      id: noteId(),
      spaceId: SPACE_ID,
      mutate: () => body(),
      conversationId: CONVERSATION_ID,
      conversations: owner(),
      attachments: { create } as unknown as AttachmentPublicClient,
    });

    expect(document).toEqual({ id: noteId(), ...body() });
    expect(create).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      id: noteId(),
      type: TYPE,
      origin: noteId(),
      data: document,
    });
    expect(storage.entries.has(noteId())).toBe(true);
  });

  it('shows the attachment unless the definition hides it', () => {
    expect(note.hiddenInConversation).toBe(false);
    expect(hiddenNote.hiddenInConversation).toBe(true);
  });

  it('creates a hidden attachment when the definition hides it', async () => {
    const { service } = setup();
    const create = jest.fn().mockResolvedValue({ id: noteId() });

    const document = await hiddenNote.writeAndAttach({
      service,
      id: noteId(),
      spaceId: SPACE_ID,
      mutate: () => body(),
      conversationId: CONVERSATION_ID,
      conversations: owner(),
      attachments: { create } as unknown as AttachmentPublicClient,
    });

    expect(create).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      id: noteId(),
      type: TYPE,
      origin: noteId(),
      data: document,
      hidden: true,
    });
  });

  it('updates an existing attachment of a hidden definition with its data only', async () => {
    const { service } = setup();
    const update = jest.fn().mockResolvedValue({ id: noteId() });

    const document = await hiddenNote.writeAndAttach({
      service,
      id: noteId(),
      spaceId: SPACE_ID,
      mutate: () => body(),
      conversationId: CONVERSATION_ID,
      conversations: owner(),
      attachments: {
        create: jest
          .fn()
          .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: noteId() })),
        get: jest.fn().mockResolvedValue({ id: noteId(), active: true }),
        update,
      } as unknown as AttachmentPublicClient,
    });

    expect(update).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      attachmentId: noteId(),
      data: document,
    });
  });

  it('does not write when the caller cannot converse with the conversation', async () => {
    const { storage, service } = setup();

    // `conversations.get` itself enforces `converse` access and fails closed as not-found;
    // `writeAndAttach` relies on that instead of a separate permission check.
    await expect(
      note.writeAndAttach({
        service,
        id: noteId(),
        spaceId: SPACE_ID,
        mutate: () => body(),
        conversationId: CONVERSATION_ID,
        conversations: {
          get: jest
            .fn()
            .mockRejectedValue(
              createConversationNotFoundError({ conversationId: CONVERSATION_ID })
            ),
        } as unknown as ConversationPublicClient,
        attachments: { create: jest.fn() } as unknown as AttachmentPublicClient,
      })
    ).rejects.toEqual(createConversationNotFoundError({ conversationId: CONVERSATION_ID }));
    expect(storage.entries.size).toBe(0);
  });

  it('leaves a soft-deleted attachment alone and keeps the index write', async () => {
    const { storage, service } = setup();
    const update = jest.fn();

    await note.writeAndAttach({
      service,
      id: noteId(),
      spaceId: SPACE_ID,
      mutate: () => body(),
      conversationId: CONVERSATION_ID,
      conversations: owner(),
      attachments: {
        create: jest
          .fn()
          .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: noteId() })),
        get: jest.fn().mockResolvedValue({ id: noteId(), active: false }),
        update,
      } as unknown as AttachmentPublicClient,
    });

    expect(update).not.toHaveBeenCalled();
    expect(storage.entries.has(noteId())).toBe(true);
  });

  it('reverts the index write when the attachment write fails', async () => {
    const { storage, service } = setup();

    await expect(
      note.writeAndAttach({
        service,
        id: noteId(),
        spaceId: SPACE_ID,
        mutate: () => body(),
        conversationId: CONVERSATION_ID,
        conversations: owner(),
        attachments: {
          create: jest.fn().mockRejectedValue(new Error('conversation write failed')),
        } as unknown as AttachmentPublicClient,
      })
    ).rejects.toThrow('conversation write failed');
    expect(storage.entries.has(noteId())).toBe(false);
  });
});

describe('writeFromTool', () => {
  const setupTool = (definitionUnderTest = note) => {
    const { storage, service } = setup();
    const definition = registeredType(service);
    const attachments = createAttachmentStateManager([], {
      getTypeDefinition: (type) => (type === TYPE ? definition : undefined),
    });
    const context = { attachments, request: httpServerMock.createKibanaRequest() };
    const write = (count: number) =>
      definitionUnderTest.writeFromTool({
        service,
        id: noteId(),
        spaceId: SPACE_ID,
        mutate: () => body({ count }),
        context,
      });
    return { storage, attachments, write };
  };

  it('adds a readonly by-reference attachment, then versions it on the next write', async () => {
    const { attachments, write } = setupTool();

    await expect(write(1)).resolves.toMatchObject({ attachment: 'added' });
    const added = attachments.getAttachmentRecord(noteId());
    expect(added).toMatchObject({
      type: TYPE,
      origin: noteId(),
      readonly: true,
      description: 'Note 1',
      current_version: 1,
    });

    await expect(write(2)).resolves.toMatchObject({ attachment: 'updated' });
    const updated = attachments.getAttachmentRecord(noteId());
    expect(updated?.current_version).toBe(2);
    expect(updated?.versions[1].data).toEqual({ id: noteId(), ...body({ count: 2 }) });
  });

  it('adds a hidden attachment whose changes are flagged hidden when the definition hides it', async () => {
    const { attachments, write } = setupTool(hiddenNote);

    await write(1);
    await write(2);

    expect(attachments.getAttachmentRecord(noteId())).toMatchObject({
      hidden: true,
      current_version: 2,
    });
    expect(attachments.drainChanges()).toEqual([
      expect.objectContaining({ kind: 'added', attachment_id: noteId(), hidden: true }),
      expect.objectContaining({ kind: 'updated', attachment_id: noteId(), hidden: true }),
    ]);
  });

  it('keeps an attachment the user removed removed, but still writes the index', async () => {
    const { storage, attachments, write } = setupTool();
    await write(1);
    attachments.delete(noteId());

    await expect(write(2)).resolves.toMatchObject({ attachment: 'removed_by_user' });
    expect(attachments.getAttachmentRecord(noteId())?.active).toBe(false);
    expect(storage.entries.get(noteId())?.source.count).toBe(2);
  });

  it('reverts the index write when the attachment is rejected', async () => {
    const { storage, attachments } = setupTool();
    const service = note.createServiceFromStorage(storage);

    await expect(
      note.writeFromTool({
        service,
        id: noteId(),
        spaceId: SPACE_ID,
        mutate: () => body({ text: 'x'.repeat(21) }),
        context: { attachments, request: httpServerMock.createKibanaRequest() },
      })
    ).rejects.toThrow();
    expect(storage.entries.has(noteId())).toBe(false);
  });
});
