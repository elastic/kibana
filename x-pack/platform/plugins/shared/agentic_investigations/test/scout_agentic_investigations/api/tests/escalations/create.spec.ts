/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, INTERNAL_HEADERS, CREATE_ESCALATION_PATH } from '../../fixtures';

// Seed an investigation conversation directly in ES so we have a real id to escalate.
// We write it through the Agent Builder conversation index that the plugin itself uses.
const INVESTIGATION_TEMPLATE_ID = 'investigation';
const ESCALATION_TEMPLATE_ID = 'escalation';
const INVESTIGATION_INDEX = '.chat-conversations';

apiTest.describe(
  'POST /internal/investigations/escalations — create escalation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;
    let investigationId: string;

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Seed a minimal investigation conversation so we have a valid linked_investigation_id.
      const result = await esClient.index({
        index: INVESTIGATION_INDEX,
        refresh: true,
        document: {
          template_id: INVESTIGATION_TEMPLATE_ID,
          title: 'Scout test investigation',
          agent_id: 'default',
          space_id: 'default',
          '@timestamp': new Date().toISOString(),
          metadata: {
            status: 'open',
            severity: 'high',
            summary: 'Suspicious PowerShell',
            workflow_execution_id: 'wf-scout-test',
          },
          access_control: { access_mode: 'public' },
        },
      });
      investigationId = result._id;
    });

    apiTest.afterAll(async ({ esClient }) => {
      if (investigationId) {
        await esClient.delete({ index: INVESTIGATION_INDEX, id: investigationId }).catch(() => {});
      }
    });

    apiTest('creates a public escalation and returns 200', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.template_id).toBe(ESCALATION_TEMPLATE_ID);
      expect(response.body.title).toBe('Scout test investigation');
    });

    apiTest(
      'copies overlapping metadata from the investigation (severity, summary)',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { metadata } = response.body;
        expect(metadata.severity).toBe('high');
        expect(metadata.summary).toBe('Suspicious PowerShell');
      }
    );

    apiTest(
      'does NOT copy workflow_execution_id — investigation-only field',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.metadata?.workflow_execution_id).toBeUndefined();
      }
    );

    apiTest(
      'sets status to "open" regardless of the investigation status',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.metadata.status).toBe('open');
      }
    );

    apiTest('sets linked_investigations to [linked_investigation_id]', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.linked_investigations).toStrictEqual([investigationId]);
    });

    apiTest('returns 400 when public + collaborators is provided', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
          collaborators: ['u_someone'],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when private + no collaborators', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'private',
          collaborators: [],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 400 when linked_investigation_id points at a non-investigation',
      async ({ apiClient, esClient }) => {
        // Seed a second conversation that is an escalation (wrong template)
        const { _id: escalationId } = await esClient.index({
          index: INVESTIGATION_INDEX,
          refresh: true,
          document: {
            template_id: ESCALATION_TEMPLATE_ID,
            title: 'Wrong template',
            agent_id: 'default',
            space_id: 'default',
            '@timestamp': new Date().toISOString(),
            metadata: { status: 'open' },
            access_control: { access_mode: 'public' },
          },
        });

        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: escalationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);

        await esClient.delete({ index: INVESTIGATION_INDEX, id: escalationId }).catch(() => {});
      }
    );

    apiTest(
      'returns 403 for a caller without the manage_escalations privilege',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        // viewer has read on agenticInvestigations but not manage_escalations
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns 404 when linked_investigation_id does not exist', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: 'nonexistent-id-00000000',
          visibility: 'public',
        },
        responseType: 'json',
      });

      // Access denial and not-found both surface as 404 (documented behaviour)
      expect(response).toHaveStatusCode(404);
    });
  }
);
