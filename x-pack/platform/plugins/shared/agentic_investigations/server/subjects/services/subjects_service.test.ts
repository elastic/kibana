/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  createAttachmentAlreadyExistsError,
  createAttachmentNotFoundError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type {
  AgentBuilderPluginSetup,
  AttachmentPublicClient,
  ConversationPublicClient,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { SUBJECT_ATTACHMENT_TYPE } from '../../../common/subjects/constants';
import type { InvestigationSubjectInput } from '../../../common/subjects/subject';
import { InvestigationAttachmentInvalidRequestError } from '../../investigation_attachments';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import { registerSubjectAttachment, subjectAttachment } from '../attachments';
import type { SubjectClaimDocument, SubjectDocument } from '../storage/subject_storage';
import { SubjectClaimsService } from './subject_claims_service';
import { subjectDocumentId, SubjectsService } from './subjects_service';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';
const request = httpServerMock.createKibanaRequest();
const analyst = { username: 'analyst', fullName: null, email: null };

const alertSubject: InvestigationSubjectInput = {
  type: 'alert',
  id: 'alert-1',
  triggerType: 'automatic',
  snapshot: { id: 'alert-1', rule_name: 'High latency', status: 'active', extra: { a: 1 } },
};

const slackSubject: InvestigationSubjectInput = {
  type: 'slack_thread',
  id: 'team:T1/channel:C1/thread:1700000000.000100',
  summary: 'Why is checkout slow?',
  slack: { channel: 'C1', thread_ts: '1700000000.000100' },
};

/** A public attachment client over a real attachment state manager. */
const createAttachmentClient = (definition: AttachmentTypeDefinition) => {
  const manager = createAttachmentStateManager([], {
    getTypeDefinition: (type) => (type === SUBJECT_ATTACHMENT_TYPE ? definition : undefined),
  });
  const client = {
    create: jest.fn(async ({ id, type, data, origin }) => {
      if (id && manager.getAttachmentRecord(id)) {
        throw createAttachmentAlreadyExistsError({ attachmentId: id });
      }
      return manager.add({ id, type, data, origin }, ATTACHMENT_REF_ACTOR.user, undefined, {
        request,
      });
    }),
    get: jest.fn(async ({ attachmentId }) => {
      const record = manager.getAttachmentRecord(attachmentId);
      if (!record) {
        throw createAttachmentNotFoundError({ attachmentId });
      }
      return record;
    }),
    update: jest.fn(async ({ attachmentId, data }) =>
      manager.update(attachmentId, { data }, ATTACHMENT_REF_ACTOR.user, { request })
    ),
  };
  return { manager, client: client as unknown as AttachmentPublicClient & typeof client };
};

const setup = () => {
  const storage = createInMemoryStorage<SubjectDocument>();
  const claimStorage = createInMemoryStorage<SubjectClaimDocument>();
  const service = new SubjectsService({
    documents: subjectAttachment.createServiceFromStorage(storage),
    claims: new SubjectClaimsService({ storage: claimStorage }),
  });

  const registerType = jest.fn();
  registerSubjectAttachment(
    { attachments: { registerType } } as unknown as AgentBuilderPluginSetup,
    {
      getSubjectsService: () => service,
      privileges: { assertCanManage: jest.fn(), assertCanRead: jest.fn() },
      logger: loggerMock.create(),
    }
  );
  const definition = registerType.mock.calls[0][0] as AttachmentTypeDefinition;
  const { manager, client } = createAttachmentClient(definition);
  const conversations = {
    get: jest.fn().mockResolvedValue({ permissions: { update_access_control: true } }),
  } as unknown as ConversationPublicClient & { get: jest.Mock };

  const upsert = (subjects: InvestigationSubjectInput[], conversationId = CONVERSATION_ID) =>
    service.upsertSubjects({
      conversationId,
      subjects,
      spaceId: SPACE_ID,
      user: analyst,
      conversations,
      attachments: client,
    });

  return { storage, service, definition, manager, client, conversations, upsert };
};

describe('SubjectsService', () => {
  it('writes one document per subject and attaches each by reference', async () => {
    const { storage, manager, upsert } = setup();

    const written = await upsert([alertSubject, slackSubject]);

    expect(written).toHaveLength(2);
    const alertId = subjectDocumentId(SPACE_ID, CONVERSATION_ID, alertSubject);
    expect(storage.entries.get(alertId)?.source).toMatchObject({
      spaceId: SPACE_ID,
      conversationId: CONVERSATION_ID,
      subjectType: 'alert',
      subjectId: 'alert-1',
      triggerType: 'automatic',
      snapshot: { rule_name: 'High latency', extra: { a: 1 } },
      createdBy: analyst,
    });
    expect(manager.getAttachmentRecord(alertId)).toMatchObject({
      type: SUBJECT_ATTACHMENT_TYPE,
      origin: alertId,
      readonly: true,
      active: true,
    });
    expect(manager.getActive()).toHaveLength(2);
  });

  it('keeps fields a later write leaves out and merges Slack fields', async () => {
    const { storage, upsert } = setup();
    await upsert([slackSubject]);

    await upsert([
      {
        type: slackSubject.type,
        id: slackSubject.id,
        slack: { channel: 'C1', thread_ts: '1700000000.000100', status_message_ts: '1700.2' },
      },
    ]);

    const stored = storage.entries.get(subjectDocumentId(SPACE_ID, CONVERSATION_ID, slackSubject));
    expect(stored?.source).toMatchObject({
      summary: 'Why is checkout slow?',
      slack: { channel: 'C1', thread_ts: '1700000000.000100', status_message_ts: '1700.2' },
    });
  });

  it('does not re-stamp an unchanged subject', async () => {
    const { client, manager, upsert } = setup();
    await upsert([alertSubject]);
    const id = subjectDocumentId(SPACE_ID, CONVERSATION_ID, alertSubject);

    await upsert([alertSubject]);

    expect(manager.getAttachmentRecord(id)?.current_version).toBe(1);
    expect(client.update).toHaveBeenCalled();
  });

  it('does not write when the caller does not own the conversation', async () => {
    const { storage, conversations, upsert } = setup();
    conversations.get.mockResolvedValue({ permissions: { update_access_control: false } });

    await expect(upsert([alertSubject])).rejects.toEqual(
      createConversationNotFoundError({ conversationId: CONVERSATION_ID })
    );
    expect(storage.entries.size).toBe(0);
  });

  it('rejects inputs that do not fit the subject type', async () => {
    const { upsert } = setup();

    await expect(
      upsert([{ type: 'manual', id: 'q-1', slack: { channel: 'C', thread_ts: '1' } }])
    ).rejects.toBeInstanceOf(InvestigationAttachmentInvalidRequestError);
    await expect(upsert([])).rejects.toBeInstanceOf(InvestigationAttachmentInvalidRequestError);
    await expect(
      upsert([
        {
          ...slackSubject,
          slack: {
            channel: 'C1',
            thread_ts: '1',
            permalink: 'http://example.slack.com/archives/C1',
          },
        },
      ])
    ).rejects.toBeInstanceOf(InvestigationAttachmentInvalidRequestError);
  });

  it('refuses more subjects than an investigation may hold', async () => {
    const { storage, upsert } = setup();
    for (let index = 0; index < 100; index++) {
      storage.put(`existing-${index}`, {
        spaceId: SPACE_ID,
        conversationId: CONVERSATION_ID,
        subjectType: 'alert',
        subjectId: `alert-${index + 100}`,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    }

    await expect(upsert([alertSubject])).rejects.toBeInstanceOf(
      InvestigationAttachmentInvalidRequestError
    );
  });

  it('finds investigations by subject type and id within the space', async () => {
    const { service, upsert, storage } = setup();
    await upsert([alertSubject], 'conv-1');
    await upsert([{ type: 'significant_event', id: 'alert-1' }], 'conv-2');
    await upsert([slackSubject], 'conv-3');
    storage.put('other-space', {
      spaceId: 'other',
      conversationId: 'conv-4',
      subjectType: 'alert',
      subjectId: 'alert-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(
      service.findConversationIdsBySubjects([{ type: 'alert', id: 'alert-1' }], SPACE_ID)
    ).resolves.toEqual(['conv-1']);
    await expect(
      service
        .findConversationIdsBySubjects(
          [
            { type: 'alert', id: 'alert-1' },
            { type: 'slack_thread', id: slackSubject.id },
          ],
          SPACE_ID
        )
        .then((ids) => ids.sort())
    ).resolves.toEqual(['conv-1', 'conv-3']);
    await expect(service.findConversationIdsBySubjects([], SPACE_ID)).resolves.toEqual([]);
  });

  it('bounds the claiming conversation id', async () => {
    const { service } = setup();

    await expect(
      service.claimSubjects({
        spaceId: SPACE_ID,
        conversationId: 'c'.repeat(257),
        subjects: [{ type: 'alert', id: 'alert-1' }],
        isHolderOpen: jest.fn(),
      })
    ).rejects.toBeInstanceOf(InvestigationAttachmentInvalidRequestError);
  });

  it('lists the subjects of investigations', async () => {
    const { service, upsert } = setup();
    await upsert([alertSubject, slackSubject], 'conv-1');
    await upsert([{ type: 'manual', id: 'q-1', summary: 'Why?' }], 'conv-2');

    const subjects = await service.listByConversationIds(['conv-1', 'conv-2'], SPACE_ID);

    expect(subjects.map(({ subjectId }) => subjectId).sort()).toEqual([
      'alert-1',
      'q-1',
      slackSubject.id,
    ]);
  });
});

describe('investigation_subject attachment type', () => {
  it('formats subjects for the agent without the raw snapshot', async () => {
    const { definition, upsert } = setup();
    const [alert, slack] = await upsert([alertSubject, slackSubject]);

    const format = async (data: object) =>
      (
        await definition.format(
          { id: 'a', type: SUBJECT_ATTACHMENT_TYPE, data },
          { request, spaceId: SPACE_ID }
        )
      ).getRepresentation?.();

    const alertText = await format(alert);
    expect(alertText).toEqual({
      type: 'text',
      value: expect.stringContaining('Rule: High latency'),
    });
    expect(JSON.stringify(alertText)).not.toContain('extra');
    await expect(format(slack)).resolves.toEqual({
      type: 'text',
      value: expect.stringContaining('Channel: #C1'),
    });
  });
});
