/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { AB_CONVERSATION_BY_ID_PATH, PUBLIC_HEADERS } from './constants';

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
