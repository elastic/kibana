/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ConversationEvent } from '@kbn/agent-builder-common';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  ConversationActivityEventType,
  EventActorType,
  TimelineEventType,
  isActivityEvent,
  isTimelineEvent,
} from '@kbn/agent-builder-common';
import type { CreateAttachmentResponse } from '../../../../../common/http_api/attachments';
import type {
  CreateConversationResponse,
  GetConversationResponse,
  RenameConversationResponse,
} from '../../../../../common/http_api/conversations';
import { internalApiPath } from '../../../../../common/constants';
import { deleteAllConversationsFromEs } from '../../../../scout_agent_builder_shared/lib/conversations_es';
import { apiTest, API_AGENT_BUILDER, ELASTIC_API_VERSION } from '../fixtures';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;
const CONVERSATION_PATH = (id: string) => `${CONVERSATIONS_PATH}/${encodeURIComponent(id)}`;
const INTERNAL_CONVERSATION_PATH = (id: string) =>
  `${internalApiPath}/conversations/${encodeURIComponent(id)}`;
const RENAME_PATH = (id: string) => `${INTERNAL_CONVERSATION_PATH(id)}/_rename`;
const INTERNAL_HEADERS = { 'elastic-api-version': ELASTIC_API_VERSION };

/** Registered by the agent_builder_platform plugin; its only defaulted field is `status`. */
const ESCALATION_TEMPLATE = { id: 'escalation', version: 1 };

const member = (id: string) => ({
  type: 'user' as const,
  id,
  role: ConversationAccessControlRole.Member,
});

/**
 * The activity events the conversation client appends on create, rename and access-control
 * changes: stored on `conversation.events`, attributed to the acting user, not addable via the API.
 * Attachment changes are activity too, while staying timeline events.
 */
apiTest.describe(
  'Agent Builder — conversation activity events',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let conversationId: string;

    const activityEvents = async (asAdmin: any): Promise<ConversationEvent[]> => {
      const res = await asAdmin.get(CONVERSATION_PATH(conversationId), { responseType: 'json' });
      expect(res).toHaveStatusCode(200);
      return ((res.body as GetConversationResponse).events ?? []).filter(isActivityEvent);
    };

    apiTest.beforeAll(async ({ asAdmin }) => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { title: 'Activity log target' },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      conversationId = (res.body as CreateConversationResponse).id;
    });

    apiTest.afterAll(async ({ esClient }) => {
      await deleteAllConversationsFromEs(esClient);
    });

    apiTest('creating a conversation records conversation_created', async ({ asAdmin }) => {
      const [created] = await activityEvents(asAdmin);

      expect(created.type).toBe(ConversationActivityEventType.conversationCreated);
      expect(created.actor.type).toBe(EventActorType.user);
      const data = created.data as { agent_id?: string; access_mode?: string };
      expect(typeof data.agent_id).toBe('string');
      expect(data.access_mode).toBe(ConversationAccessControlMode.Private);
      expect(Object.keys(data).sort()).toStrictEqual(['access_mode', 'agent_id']);
      expect(created.id).not.toContain('::');
    });

    apiTest(
      'renaming records title_updated, and a same-title rename records nothing',
      async ({ asAdmin }) => {
        const before = await activityEvents(asAdmin);

        const renamed = await asAdmin.post(RENAME_PATH(conversationId), {
          headers: INTERNAL_HEADERS,
          body: { title: 'Renamed target' },
          responseType: 'json',
        });
        expect(renamed).toHaveStatusCode(200);
        expect((renamed.body as RenameConversationResponse).title).toBe('Renamed target');

        const afterRename = await activityEvents(asAdmin);
        expect(afterRename).toHaveLength(before.length + 1);
        const titleUpdated = afterRename[afterRename.length - 1];
        expect(titleUpdated.type).toBe(ConversationActivityEventType.titleUpdated);
        expect(titleUpdated.actor.type).toBe(EventActorType.user);
        expect(titleUpdated.data).toStrictEqual({
          previous_title: 'Activity log target',
          title: 'Renamed target',
        });

        const sameTitle = await asAdmin.post(RENAME_PATH(conversationId), {
          headers: INTERNAL_HEADERS,
          body: { title: 'Renamed target' },
          responseType: 'json',
        });
        expect(sameTitle).toHaveStatusCode(200);
        expect(await activityEvents(asAdmin)).toHaveLength(afterRename.length);
      }
    );

    apiTest(
      'sharing records participants_added, publishing records visibility_updated and participants_removed',
      async ({ asAdmin }) => {
        const before = await activityEvents(asAdmin);

        const shared = await asAdmin.put(`${CONVERSATION_PATH(conversationId)}/access_control`, {
          body: {
            access_mode: ConversationAccessControlMode.Private,
            entries: [member('activity-user-a'), member('activity-user-b')],
          },
          responseType: 'json',
        });
        expect(shared).toHaveStatusCode(200);

        const afterShare = await activityEvents(asAdmin);
        expect(afterShare.slice(before.length).map((event) => event.type)).toStrictEqual([
          ConversationActivityEventType.participantsAdded,
        ]);
        expect(afterShare[afterShare.length - 1].data).toStrictEqual({
          participants: [member('activity-user-a'), member('activity-user-b')],
        });

        const published = await asAdmin.put(`${CONVERSATION_PATH(conversationId)}/access_control`, {
          body: { access_mode: ConversationAccessControlMode.Public, entries: [] },
          responseType: 'json',
        });
        expect(published).toHaveStatusCode(200);

        const afterPublish = await activityEvents(asAdmin);
        const appended = afterPublish.slice(afterShare.length);
        expect(appended.map((event) => event.type)).toStrictEqual([
          ConversationActivityEventType.visibilityUpdated,
          ConversationActivityEventType.participantsRemoved,
        ]);
        expect(appended[0].data).toStrictEqual({
          previous_access_mode: ConversationAccessControlMode.Private,
          access_mode: ConversationAccessControlMode.Public,
        });
        expect(appended[1].data).toStrictEqual({
          participants: [member('activity-user-a'), member('activity-user-b')],
        });

        // An identical request appends nothing.
        const unchanged = await asAdmin.put(`${CONVERSATION_PATH(conversationId)}/access_control`, {
          body: { access_mode: ConversationAccessControlMode.Public, entries: [] },
          responseType: 'json',
        });
        expect(unchanged).toHaveStatusCode(200);
        expect(await activityEvents(asAdmin)).toHaveLength(afterPublish.length);
      }
    );

    apiTest(
      'adding an attachment records attachment_added, an activity event that is also a timeline event',
      async ({ asAdmin }) => {
        const before = await activityEvents(asAdmin);

        const posted = await asAdmin.post(`${CONVERSATION_PATH(conversationId)}/attachments`, {
          body: { type: 'text', data: { content: 'activity log attachment' } },
          responseType: 'json',
        });
        expect(posted).toHaveStatusCode(200);
        const { attachment } = posted.body as CreateAttachmentResponse;

        const after = await activityEvents(asAdmin);
        const appended = after.slice(before.length);
        expect(appended.map((event) => event.type)).toStrictEqual([
          TimelineEventType.attachmentAdded,
        ]);
        expect(isTimelineEvent(appended[0])).toBe(true);
        expect(appended[0].actor.type).toBe(EventActorType.user);
        expect((appended[0].data as { attachment_id?: string }).attachment_id).toBe(attachment.id);
      }
    );

    apiTest(
      'applying a template and patching metadata record metadata_updated with the changed fields only',
      async ({ asAdmin }) => {
        const before = await activityEvents(asAdmin);

        const applied = await asAdmin.post(
          `${INTERNAL_CONVERSATION_PATH(conversationId)}/_apply_template`,
          {
            headers: INTERNAL_HEADERS,
            body: { template_id: ESCALATION_TEMPLATE.id },
            responseType: 'json',
          }
        );
        expect(applied).toHaveStatusCode(200);

        const afterApply = await activityEvents(asAdmin);
        const seeded = afterApply.slice(before.length);
        expect(seeded.map((event) => event.type)).toStrictEqual([
          ConversationActivityEventType.metadataUpdated,
        ]);
        expect(seeded[0].actor.type).toBe(EventActorType.user);
        // Only the template's defaulted field is seeded; values are never recorded.
        expect(seeded[0].data).toStrictEqual({
          changed_fields: ['status'],
          template_id: ESCALATION_TEMPLATE.id,
          template_version: ESCALATION_TEMPLATE.version,
        });

        const patched = await asAdmin.patch(
          `${INTERNAL_CONVERSATION_PATH(conversationId)}/metadata`,
          {
            headers: INTERNAL_HEADERS,
            body: { metadata: { severity: 'high' } },
            responseType: 'json',
          }
        );
        expect(patched).toHaveStatusCode(200);

        const afterPatch = await activityEvents(asAdmin);
        const changed = afterPatch.slice(afterApply.length);
        expect(changed.map((event) => event.type)).toStrictEqual([
          ConversationActivityEventType.metadataUpdated,
        ]);
        expect(changed[0].data).toStrictEqual({
          changed_fields: ['severity'],
          template_id: ESCALATION_TEMPLATE.id,
          template_version: ESCALATION_TEMPLATE.version,
        });

        // Patching the same value again appends nothing.
        const unchanged = await asAdmin.patch(
          `${INTERNAL_CONVERSATION_PATH(conversationId)}/metadata`,
          {
            headers: INTERNAL_HEADERS,
            body: { metadata: { severity: 'high' } },
            responseType: 'json',
          }
        );
        expect(unchanged).toHaveStatusCode(200);
        expect(await activityEvents(asAdmin)).toHaveLength(afterPatch.length);
      }
    );

    apiTest(
      'activity events keep the conversation readable and stay out of rounds',
      async ({ asAdmin }) => {
        const res = await asAdmin.get(CONVERSATION_PATH(conversationId), { responseType: 'json' });
        expect(res).toHaveStatusCode(200);
        const conversation = res.body as GetConversationResponse;

        expect(conversation.rounds).toStrictEqual([]);
        expect(conversation.events?.every(isActivityEvent)).toBe(true);
        expect(conversation.events?.every((event) => !event.id.includes('::'))).toBe(true);
      }
    );

    apiTest('activity event types cannot be added through the events API', async ({ asAdmin }) => {
      const res = await asAdmin.post(`${CONVERSATION_PATH(conversationId)}/_add_events`, {
        headers: INTERNAL_HEADERS,
        body: {
          events: [
            {
              type: ConversationActivityEventType.titleUpdated,
              data: { previous_title: 'a', title: 'b' },
            },
          ],
        },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
      expect(String((res.body as { message?: string }).message)).toContain(
        'internal and cannot be added directly'
      );
    });
  }
);
