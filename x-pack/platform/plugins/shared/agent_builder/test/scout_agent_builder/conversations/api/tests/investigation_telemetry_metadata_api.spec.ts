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
import { apiTest, API_AGENT_BUILDER } from '../fixtures';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;

apiTest.describe(
  'Investigation conversation telemetry metadata',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const conversationIds: string[] = [];

    apiTest.afterAll(async ({ asAdmin }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${CONVERSATIONS_PATH}/${id}`);
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
