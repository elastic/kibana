/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { TRIGGER_USER_INTERACTION_METADATA_API_ROUTE } from '../../../../common/constants';
import { interceptInteractionUserRecordSavedObject } from '../../../../server/saved_objects';
import { apiTest, SavedObjectsCleanup, testData } from '../fixtures';

const getInteractionRoute = (triggerId: string) =>
  TRIGGER_USER_INTERACTION_METADATA_API_ROUTE.replace('{triggerId}', triggerId);

apiTest.describe('Intercept User Interaction APIs', { tag: tags.deploymentAgnostic }, () => {
  const savedObjectsCleanup = new SavedObjectsCleanup();
  let profileUid: string;
  let viewerCookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

    const response = await apiClient.get('/internal/security/me', {
      headers: { ...testData.COMMON_HEADERS, ...viewerCookieHeader },
    });
    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.profile_uid).toBe('string');
    profileUid = response.body.profile_uid;
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await savedObjectsCleanup.cleanup(kbnClient);
  });

  apiTest('returns an empty object when no interaction exists', async ({ apiClient }) => {
    const triggerId = `scout-interaction-missing-${randomUUID()}`;

    const response = await apiClient.get(getInteractionRoute(triggerId), {
      headers: { ...testData.COMMON_HEADERS, ...viewerCookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({});
  });

  apiTest('records and returns the last interaction', async ({ apiClient }) => {
    const triggerId = `scout-interaction-${randomUUID()}`;
    const interactionRecord = { lastInteractedInterceptId: 1 };
    savedObjectsCleanup.track({
      type: interceptInteractionUserRecordSavedObject.name,
      id: `${triggerId}:${profileUid}`,
    });

    const createResponse = await apiClient.post(getInteractionRoute(triggerId), {
      headers: { ...testData.COMMON_HEADERS, ...viewerCookieHeader },
      body: interactionRecord,
    });
    expect(createResponse).toHaveStatusCode(201);

    const getResponse = await apiClient.get(getInteractionRoute(triggerId), {
      headers: { ...testData.COMMON_HEADERS, ...viewerCookieHeader },
    });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body).toStrictEqual(interactionRecord);
  });
});
