/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ConversationUpdatedTriggerId } from '@kbn/agent-builder-common';
import type { CreateConversationResponse } from '../../../../../common/http_api/conversations';
import { chatApiPath } from '../../../../../common/constants';
import type { AuthedApiClient } from '../../../../scout_agent_builder_shared/lib/authed_api_client';
import {
  apiTest,
  API_AGENT_BUILDER,
  ELASTIC_API_VERSION,
  INTERNAL_AGENT_BUILDER,
} from '../fixtures';

const VERSION_HEADERS = { 'elastic-api-version': ELASTIC_API_VERSION };
const INTERNAL_WORKFLOWS_VERSION_HEADERS = { 'elastic-api-version': '1' };
const WORKFLOW_ID = `conversation-updated-trigger-${Date.now()}`;

const WORKFLOW_YAML = `name: ai.conversation.updated e2e
enabled: true
triggers:
  - type: ${ConversationUpdatedTriggerId}
    on:
      condition: 'event.templateId: "investigation" and (event.eventTypes: "user_message" or event.changedFields: "severity")'
steps:
  - name: log
    type: console
    with:
      message: '{{ event.conversationId }}'
`;

interface TriggeredExecution {
  context?: { event?: { conversationId?: string; source?: string; changeKinds?: string[] } };
}

const createConversation = async (client: AuthedApiClient, templateId: string) => {
  const res = await client.post(`${API_AGENT_BUILDER}/conversations`, {
    headers: VERSION_HEADERS,
    body: { template_id: templateId },
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(200);
  return (res.body as CreateConversationResponse).id;
};

const postUserMessage = async (client: AuthedApiClient, conversationId: string) => {
  const res = await client.post(`${chatApiPath}/converse`, {
    headers: VERSION_HEADERS,
    body: { trigger_mode: 'never', conversation_id: conversationId, input: 'New finding' },
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(200);
};

const patchSeverity = async (client: AuthedApiClient, conversationId: string) => {
  const res = await client.patch(
    `${INTERNAL_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}/metadata`,
    { body: { metadata: { severity: 'high' } }, responseType: 'json' }
  );
  expect(res).toHaveStatusCode(200);
};

const triggeredEvents = async (client: AuthedApiClient) => {
  const list = await client.get(`api/workflows/workflow/${WORKFLOW_ID}/executions`, {
    headers: VERSION_HEADERS,
    responseType: 'json',
  });
  expect(list).toHaveStatusCode(200);
  const ids = (list.body.results as Array<{ id: string }>).map(({ id }) => id);
  const executions = await Promise.all(
    ids.map(async (id) => {
      const res = await client.get(`api/workflows/executions/${id}`, {
        headers: VERSION_HEADERS,
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      return res.body as TriggeredExecution;
    })
  );
  return executions.map(({ context }) => context?.event ?? {});
};

interface LoggedTriggerEvent {
  subscriptions: string[];
  payload: { conversationId?: string; eventTypes?: string[] };
}

interface TriggerEventsSearchResponse {
  hits: Array<{ source: LoggedTriggerEvent }>;
}

const TRIGGER_EVENTS_PAGE_SIZE = 100;
/** Stops a scan that never reaches a short page (a busy deployment); the caller's poll retries. */
const TRIGGER_EVENTS_MAX_PAGES = 20;

/**
 * The logged dispatch of an `ai.conversation.updated` event, with the workflows it matched.
 *
 * `.workflows-events` is a system data stream, so it is read through the workflows trigger event
 * log API rather than Elasticsearch. `payload` is not indexed, so the API can only narrow on
 * `triggerId` and time; pages are read until a match or a short page, up to
 * `TRIGGER_EVENTS_MAX_PAGES`, and the conversation is matched in code.
 */
const findLoggedTriggerEvent = async (
  client: AuthedApiClient,
  { since, conversationId, eventType }: { since: string; conversationId: string; eventType: string }
) => {
  for (let page = 1; page <= TRIGGER_EVENTS_MAX_PAGES; page++) {
    const res = await client.post('internal/workflows/trigger_events/_search', {
      headers: INTERNAL_WORKFLOWS_VERSION_HEADERS,
      body: {
        kql: `triggerId: "${ConversationUpdatedTriggerId}"`,
        from: since,
        page,
        size: TRIGGER_EVENTS_PAGE_SIZE,
      },
      responseType: 'json',
    });
    expect(res).toHaveStatusCode(200);
    const { hits } = res.body as TriggerEventsSearchResponse;
    const match = hits
      .map(({ source }) => source)
      .find(
        ({ payload }) =>
          payload.conversationId === conversationId && payload.eventTypes?.includes(eventType)
      );
    if (match || hits.length < TRIGGER_EVENTS_PAGE_SIZE) {
      return match;
    }
  }
  return undefined;
};

apiTest.describe(
  'Agent Builder — ai.conversation.updated workflow trigger',
  { tag: tags.stateful.classic },
  () => {
    const createdConversationIds: string[] = [];

    apiTest.beforeAll(async ({ asAdmin }) => {
      const res = await asAdmin.post('api/workflows/workflow', {
        headers: VERSION_HEADERS,
        body: { id: WORKFLOW_ID, yaml: WORKFLOW_YAML },
        responseType: 'json',
      });
      expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ asAdmin }) => {
      // A force delete is refused (409) while a triggered run is still in flight; only that is retried.
      let deleteStatus: number | undefined;
      await expect
        .poll(
          async () => {
            deleteStatus = (
              await asAdmin.delete('api/workflows?force=true', {
                headers: VERSION_HEADERS,
                body: { ids: [WORKFLOW_ID] },
                responseType: 'json',
              })
            ).statusCode;
            return deleteStatus;
          },
          { timeout: 60_000 }
        )
        .not.toBe(409);
      expect(deleteStatus).toBe(200);
      await Promise.allSettled(
        createdConversationIds.map((id) =>
          asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`, {
            headers: VERSION_HEADERS,
            responseType: 'json',
          })
        )
      );
    });

    apiTest(
      'runs on matching writes to conversations of the subscribed template only',
      async ({ asAdmin }) => {
        apiTest.setTimeout(180_000);
        const since = new Date().toISOString();

        const investigationId = await createConversation(asAdmin, 'investigation');
        createdConversationIds.push(investigationId);
        const escalationId = await createConversation(asAdmin, 'escalation');
        createdConversationIds.push(escalationId);

        await apiTest.step('a user message on the investigation triggers one run', async () => {
          await postUserMessage(asAdmin, investigationId);
          await expect
            .poll(async () => (await triggeredEvents(asAdmin)).length, { timeout: 60_000 })
            .toBe(1);
          const [event] = await triggeredEvents(asAdmin);
          expect(event.conversationId).toBe(investigationId);
          expect(event.source).toBe('execution');
          expect(event.changeKinds).toStrictEqual(['events']);
        });

        await apiTest.step('a user message on the escalation does not match', async () => {
          await postUserMessage(asAdmin, escalationId);
          let logged: LoggedTriggerEvent | undefined;
          await expect
            .poll(
              async () => {
                logged = await findLoggedTriggerEvent(asAdmin, {
                  since,
                  conversationId: escalationId,
                  eventType: 'user_message',
                });
                return logged !== undefined;
              },
              { timeout: 60_000 }
            )
            .toBe(true);
          expect(logged?.subscriptions).not.toContain(WORKFLOW_ID);
        });

        await apiTest.step('a severity patch on the investigation triggers a run', async () => {
          await patchSeverity(asAdmin, investigationId);
          await expect
            .poll(async () => (await triggeredEvents(asAdmin)).length, { timeout: 60_000 })
            .toBe(2);
          const events = await triggeredEvents(asAdmin);
          expect(events.map(({ conversationId }) => conversationId)).toStrictEqual([
            investigationId,
            investigationId,
          ]);
          expect(events.map(({ source }) => source).sort()).toStrictEqual([
            'execution',
            'http_api',
          ]);
        });
      }
    );
  }
);
