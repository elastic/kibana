/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { CreateConversationResponse } from '../../../../../common/http_api/conversations';
import {
  apiTest,
  API_AGENT_BUILDER,
  INTERNAL_AGENT_BUILDER,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
} from '../fixtures';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;

apiTest.describe(
  'Investigation conversation telemetry metadata',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const conversationIds: string[] = [];
    const cookieConversationIds: string[] = [];
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.afterAll(async ({ asAdmin, apiClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${CONVERSATIONS_PATH}/${id}`);
      }
      for (const id of cookieConversationIds) {
        await apiClient.delete(`${CONVERSATIONS_PATH}/${id}`, {
          headers: { ...adminHeaders, 'elastic-api-version': ELASTIC_API_VERSION },
        });
      }
    });

    for (const target of ['c0', 'orca', 'none', 'a'.repeat(64), 'orca-', 'orca_']) {
      apiTest(
        `stores and reads back target ${target} alongside the creating run`,
        async ({ asAdmin }) => {
          const id = randomUUID();
          conversationIds.push(id);
          const metadata = { telemetry_target: target, workflow_execution_ids: ['execution-1'] };
          const created = await asAdmin.post(CONVERSATIONS_PATH, {
            body: { conversation_id: id, template_id: 'investigation', metadata },
            responseType: 'json',
          });

          expect(created).toHaveStatusCode(200);
          expect((created.body as CreateConversationResponse).metadata).toMatchObject(metadata);

          const read = await asAdmin.get(`${CONVERSATIONS_PATH}/${id}`, { responseType: 'json' });
          expect(read).toHaveStatusCode(200);
          expect((read.body as CreateConversationResponse).metadata).toMatchObject(metadata);
        }
      );
    }

    apiTest(
      'leaves the target absent when creating a legacy investigation',
      async ({ asAdmin }) => {
        const id = randomUUID();
        conversationIds.push(id);
        const created = await asAdmin.post(CONVERSATIONS_PATH, {
          body: {
            conversation_id: id,
            template_id: 'investigation',
            metadata: { workflow_execution_ids: ['execution-1'] },
          },
          responseType: 'json',
        });

        expect(created).toHaveStatusCode(200);
        expect(
          (created.body as CreateConversationResponse).metadata?.telemetry_target
        ).toBeUndefined();
      }
    );

    for (const [originalTarget, requestedTarget] of [
      ['c0', 'orca'],
      ['orca', 'c0'],
      ['orca', 'none'],
      [undefined, 'orca'],
    ] as const) {
      const metadata = {
        workflow_execution_ids: ['execution-1'],
        ...(originalTarget ? { telemetry_target: originalTarget } : {}),
      };

      apiTest(
        `rejects changing target ${originalTarget} to ${requestedTarget} through metadata PATCH`,
        async ({ apiClient }) => {
          const id = randomUUID();
          cookieConversationIds.push(id);
          const publicHeaders = { ...adminHeaders, 'elastic-api-version': ELASTIC_API_VERSION };
          const created = await apiClient.post(CONVERSATIONS_PATH, {
            headers: publicHeaders,
            body: { conversation_id: id, template_id: 'investigation', metadata },
            responseType: 'json',
          });
          expect(created).toHaveStatusCode(200);

          const patched = await apiClient.patch(
            `${INTERNAL_AGENT_BUILDER}/conversations/${id}/metadata`,
            {
              headers: adminHeaders,
              body: {
                metadata: { telemetry_target: requestedTarget, summary: 'must not persist' },
              },
              responseType: 'json',
            }
          );
          expect(patched).toHaveStatusCode(400);
          expect(patched.body).toMatchObject({
            message: expect.stringContaining('field "telemetry_target" is immutable'),
          });

          const read = await apiClient.get(`${CONVERSATIONS_PATH}/${id}`, {
            headers: publicHeaders,
            responseType: 'json',
          });
          expect(read).toHaveStatusCode(200);
          const storedMetadata = (read.body as CreateConversationResponse).metadata;
          expect(storedMetadata?.telemetry_target).toBe(originalTarget);
          expect(storedMetadata?.workflow_execution_ids).toStrictEqual(['execution-1']);
          expect(storedMetadata?.summary).toBeUndefined();
        }
      );
    }

    apiTest('allows unchanged targets and unrelated metadata updates', async ({ apiClient }) => {
      const id = randomUUID();
      cookieConversationIds.push(id);
      const publicHeaders = { ...adminHeaders, 'elastic-api-version': ELASTIC_API_VERSION };
      const created = await apiClient.post(CONVERSATIONS_PATH, {
        headers: publicHeaders,
        body: {
          conversation_id: id,
          template_id: 'investigation',
          metadata: { telemetry_target: 'orca', workflow_execution_ids: ['execution-1'] },
        },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);

      const patched = await apiClient.patch(
        `${INTERNAL_AGENT_BUILDER}/conversations/${id}/metadata`,
        {
          headers: adminHeaders,
          body: { metadata: { telemetry_target: 'orca', summary: 'Updated summary' } },
          responseType: 'json',
        }
      );
      expect(patched).toHaveStatusCode(200);

      const read = await apiClient.get(`${CONVERSATIONS_PATH}/${id}`, {
        headers: publicHeaders,
        responseType: 'json',
      });
      expect(read).toHaveStatusCode(200);
      expect((read.body as CreateConversationResponse).metadata).toMatchObject({
        telemetry_target: 'orca',
        workflow_execution_ids: ['execution-1'],
        summary: 'Updated summary',
      });
    });

    for (const target of ['UPPERCASE', 'a'.repeat(65), '']) {
      apiTest(
        `rejects invalid target ${JSON.stringify(target)} through template validation`,
        async ({ asAdmin }) => {
          const created = await asAdmin.post(CONVERSATIONS_PATH, {
            body: { template_id: 'investigation', metadata: { telemetry_target: target } },
            responseType: 'json',
          });

          expect(created).toHaveStatusCode(400);
        }
      );
    }
  }
);
