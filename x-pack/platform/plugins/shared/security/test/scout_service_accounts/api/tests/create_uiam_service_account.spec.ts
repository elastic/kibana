/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/api';

import { apiTest, ORG_ADMIN_HEADERS as headers, serviceAccountPath } from '../fixtures';

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Create Serverless service accounts',
  { tag: ['@local-serverless-search'] },
  () => {
    apiTest(
      'persists the requested name and roles in UIAM',
      async ({ apiClient, uiamServiceAccounts }) => {
        const name = `scout-sa-${randomUUID()}`;
        const created = await uiamServiceAccounts.create({ name, roles: ['viewer', 'editor'] });
        expect(typeof created.id).toBe('string');
        expect(created.id).not.toBe('');
        expect(created).toStrictEqual({
          id: created.id,
          name,
          roles: ['viewer', 'editor'],
        });

        const stored = await apiClient.get(serviceAccountPath(created.id), {
          headers,
          responseType: 'json',
        });
        expect(stored).toHaveStatusCode(200);
        expect(stored.body).toMatchObject({ id: created.id, name, enabled: true });
        expect([...stored.body.roles].sort()).toStrictEqual(['editor', 'viewer']);
      }
    );

    apiTest(
      'persists a trimmed description in UIAM',
      async ({ apiClient, uiamServiceAccounts }) => {
        const name = `scout-sa-${randomUUID()}`;
        const created = await uiamServiceAccounts.create({
          name,
          roles: ['viewer'],
          description: '  Relays the nightshift alerts. ',
        });
        expect(created).toStrictEqual({
          id: created.id,
          name,
          roles: ['viewer'],
          description: 'Relays the nightshift alerts.',
        });

        const stored = await apiClient.get(serviceAccountPath(created.id), {
          headers,
          responseType: 'json',
        });
        expect(stored).toHaveStatusCode(200);
        expect(stored.body).toMatchObject({
          id: created.id,
          name,
          description: 'Relays the nightshift alerts.',
        });
      }
    );
  }
);
