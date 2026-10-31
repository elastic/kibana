/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ElasticsearchRoleDescriptor } from '@kbn/scout';
import {
  AB_CONVERSATIONS_PATH,
  AB_CONVERSATION_BY_ID_PATH,
  ESCALATIONS_ALL_PRIVILEGE,
  IMPACT_PATH,
  INTERNAL_HEADERS,
  PUBLIC_HEADERS,
} from './constants';

interface CreatedResponse {
  statusCode: number;
  body: { id?: string };
}

/**
 * Asserts that a POST response created a resource successfully and returns its id.
 * Throws if the status is not 200 or if the response body lacks an id — giving
 * a clear failure at setup time rather than a vacuous later assertion.
 */
export const expectCreated = (response: CreatedResponse, label: string): string => {
  if (response.statusCode !== 200 || !response.body.id) {
    throw new Error(
      `Setup: failed to create ${label} (status ${response.statusCode}): ${JSON.stringify(
        response.body
      )}`
    );
  }
  return response.body.id;
};

/**
 * Deletes a list of Agent Builder conversations identified by their ids.
 * Allows 200 (deleted) and 404 (already gone); throws on any other status
 * so teardown failures are surfaced rather than silently leaving state behind.
 *
 * @param spaceId - optional Kibana Space id; when set, requests are issued via `/s/<spaceId>/`.
 */
export const deleteConversations = async (
  apiClient: ApiClientFixture,
  ids: string[],
  cookieHeader: Record<string, string>,
  spaceId?: string
): Promise<void> => {
  const spacePrefix = spaceId && spaceId !== 'default' ? `/s/${spaceId}/` : '';
  const results = await Promise.allSettled(
    ids.filter(Boolean).map(async (id) => {
      const path = `${spacePrefix}${AB_CONVERSATION_BY_ID_PATH(id)}`;
      const res = await apiClient.delete(path, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
      });
      if (res.statusCode !== 200 && res.statusCode !== 404) {
        throw new Error(
          `Teardown: unexpected status ${
            res.statusCode
          } deleting conversation ${id} at ${path}: ${JSON.stringify(res.body)}`
        );
      }
    })
  );
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length > 0) {
    // Log all failures; throw so the test suite is marked as failing to clean up.
    const messages = failures.map((f) => String(f.reason)).join('\n');
    throw new Error(`Teardown cleanup failed:\n${messages}`);
  }
};

/**
 * Stateful editor is base Kibana All. Escalation manage is `includeIn: 'none'`, so All can
 * list escalations but not update them. Adds `escalations_all` to the editor's Kibana
 * application privileges so the caller passes the `manage_escalations` route check.
 */
export const editorWithEscalationManage = (
  editor: ElasticsearchRoleDescriptor
): ElasticsearchRoleDescriptor => {
  const applications = (editor.applications ?? []).map((application) =>
    application.application.startsWith('kibana')
      ? { ...application, privileges: [...application.privileges, ESCALATIONS_ALL_PRIVILEGE] }
      : application
  );
  if (!applications.some(({ privileges }) => privileges.includes(ESCALATIONS_ALL_PRIVILEGE))) {
    throw new Error('editor role has no Kibana application privileges to extend');
  }
  return { ...editor, applications };
};

/**
 * Resolves a user's profile uid (the stable `u_*` id used for ACL entries and assignees) by
 * creating a probe conversation as them and reading `user.id` from the response. The uid is
 * only available once the user has an activated profile, which happens on first interactive
 * login. The caller owns the probe and must delete it in teardown.
 */
export const resolveProfileUid = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>
): Promise<{ uid: string; probeConversationId: string }> => {
  const response = await apiClient.post(AB_CONVERSATIONS_PATH, {
    headers: { ...PUBLIC_HEADERS, ...cookieHeader },
    body: {
      title: '__profile-uid-probe__',
      template_id: 'investigation',
      access_control: { access_mode: 'public' },
      metadata: { status: 'open' },
    },
    responseType: 'json',
  });
  const probeConversationId = expectCreated(response, 'profile uid probe conversation');
  const uid: string | undefined = response.body.user?.id;
  if (!uid) {
    throw new Error(
      'resolveProfileUid: response did not include user.id — profile may not be activated yet'
    );
  }
  return { uid, probeConversationId };
};

/** Prefixes a path with `/s/<spaceId>` for a non-default Space. */
export const spaceUrl = (path: string, spaceId?: string): string =>
  spaceId && spaceId !== 'default' ? `/s/${spaceId}/${path}` : path;

export interface SeedInvestigationOptions {
  title: string;
  metadata?: Record<string, string>;
  impactEntities?: Array<{ id: string; name?: string }>;
  spaceId?: string;
  /** Defaults to public. A private investigation is readable by its owner only. */
  accessMode?: 'public' | 'private';
}

/**
 * Creates an investigation conversation (public by default) and attaches its impact through the
 * internal route, as the owner. Returns the conversation id.
 */
export const seedInvestigation = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  {
    title,
    metadata = { status: 'open' },
    impactEntities,
    spaceId,
    accessMode = 'public',
  }: SeedInvestigationOptions
): Promise<string> => {
  const created = await apiClient.post(spaceUrl(AB_CONVERSATIONS_PATH, spaceId), {
    headers: { ...PUBLIC_HEADERS, ...cookieHeader },
    body: {
      title,
      template_id: 'investigation',
      access_control: { access_mode: accessMode },
      metadata,
    },
    responseType: 'json',
  });
  const id = expectCreated(created, `investigation "${title}"`);

  if (impactEntities) {
    const response = await apiClient.post(spaceUrl(IMPACT_PATH, spaceId), {
      headers: { ...INTERNAL_HEADERS, ...cookieHeader },
      body: { conversationId: id, entities: impactEntities },
      responseType: 'json',
    });
    if (response.statusCode !== 200) {
      throw new Error(
        `Setup: failed to attach impact to ${id} (status ${response.statusCode}): ${JSON.stringify(
          response.body
        )}`
      );
    }
  }

  return id;
};
