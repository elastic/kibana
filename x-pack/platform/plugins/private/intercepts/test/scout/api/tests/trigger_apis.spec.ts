/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { TRIGGER_INFO_API_ROUTE } from '../../../../common/constants';
import { interceptTriggerRecordSavedObject } from '../../../../server/saved_objects';
import { apiTest, SavedObjectsCleanup, testData } from '../fixtures';

apiTest.describe('Intercept Trigger APIs', { tag: tags.deploymentAgnostic }, () => {
  const savedObjectsCleanup = new SavedObjectsCleanup();
  let viewerCookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await savedObjectsCleanup.cleanup(kbnClient);
  });

  apiTest('returns 204 when no trigger info exists', async ({ apiClient }) => {
    const triggerId = `scout-trigger-missing-${randomUUID()}`;

    const response = await apiClient.post(TRIGGER_INFO_API_ROUTE, {
      headers: { ...testData.COMMON_HEADERS, ...viewerCookieHeader },
      body: { triggerId },
    });

    expect(response).toHaveStatusCode(204);
    expect(response.body).toStrictEqual({});
  });

  apiTest('returns trigger info when it exists', async ({ apiClient, kbnClient }) => {
    const triggerId = `scout-trigger-${randomUUID()}`;
    const registeredAt = new Date().toISOString();
    savedObjectsCleanup.track({
      type: interceptTriggerRecordSavedObject.name,
      id: triggerId,
    });

    await kbnClient.savedObjects.create({
      id: triggerId,
      type: interceptTriggerRecordSavedObject.name,
      overwrite: false,
      attributes: {
        firstRegisteredAt: registeredAt,
        triggerAfter: '1h',
        recurrent: true,
        installedOn: '9.1.0',
      },
    });

    const response = await apiClient.post(TRIGGER_INFO_API_ROUTE, {
      headers: { ...testData.COMMON_HEADERS, ...viewerCookieHeader },
      body: { triggerId },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      registeredAt,
      triggerIntervalInMs: 3600000,
      recurrent: true,
    });
  });
});
