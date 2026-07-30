/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../constants';
import { apiTest } from '../fixtures';

// A valid 1x1 png encoded as a data URL, used to verify that spaces accept avatar images.
const AVATAR_IMAGE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTnU1rJkAAAB3klEQVRYR+2WzUrDQBCARzwqehE8ir1WPfgqRRA1bePBXgpe/MGCB9/Aiw+j+ASCB6kotklaEwW1F0WwNSaps9lV69awGzBpDzt8pJP9mXxsmk3ABH2oUEIilJAIJSRCCYlQQiKUkIh4QgY5agZodVjBowFrBktWQzDBU2ykiYaDuQpCYgnl3QunGzM6Z6YF+b5SkcgK1UH/aLbYReQiYL9d9/o+XFop5IU0Vl4uapAzoXC3eEBPw9vH1/wT6Vs2otPSkoH/IZzlzO/TU2vgQm8nl69Hp0H7nZ4OXogLJSSKBIUC3w88n+Ueyfv56fVZnqCQNVnCHbLrkV0Gd2d+GNkglsk438dhaTxloZDutV4wb06Vf40JcWZ2sMttPpE8NaHGeBnzIAhwPXqHseVB11EyLD0hxLUeaYud2a3B0g3k7GyFtrhX7F2RqhC+yV3jgTb2Rqdqf7/kUxYiWBOlTtXxfPJEtc8b5thGb+8AhL4ohnCNqQjZ2T2+K5rnw2M6KwEhKNDSGM3pTdxjhDgLbHkw/v/zw4AiPuSsfMzAiTidKxiF/ArpFqyzK8SMOlkwvloUMYRCtNvZLWeuIomd2Za/WZS4QomjhEQoIRFKSIQSEqGERAyfEH4YDBFQ/ARU6BiBxCAIQQAAAABJRU5ErkJggg==';

apiTest.describe('Space attributes', { tag: tags.stateful.all }, () => {
  let adminApiCredentials: RoleApiCredentials;
  const createdSpaceIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterAll(async ({ apiServices }) => {
    for (const id of createdSpaceIds) {
      await apiServices.spaces.delete(id);
    }
  });

  apiTest(
    'should allow a space to be created with a mixed-case hex color code',
    async ({ apiClient }) => {
      const response = await apiClient.post('api/spaces/space', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        body: {
          id: 'api-test-space',
          name: 'api test space',
          disabledFeatures: [],
          color: '#aaBB78',
        },
      });

      expect(response).toHaveStatusCode(200);
      createdSpaceIds.push('api-test-space');
      expect(response.body).toStrictEqual({
        id: 'api-test-space',
        name: 'api test space',
        disabledFeatures: [],
        color: '#aaBB78',
      });
    }
  );

  apiTest('should allow a space to be created with an avatar image', async ({ apiClient }) => {
    const response = await apiClient.post('api/spaces/space', {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      body: {
        id: 'api-test-space2',
        name: 'Space with image',
        disabledFeatures: [],
        color: '#cafeba',
        imageUrl: AVATAR_IMAGE_URL,
      },
    });

    expect(response).toHaveStatusCode(200);
    createdSpaceIds.push('api-test-space2');
    expect(response.body).toStrictEqual({
      id: 'api-test-space2',
      name: 'Space with image',
      disabledFeatures: [],
      color: '#cafeba',
      imageUrl: AVATAR_IMAGE_URL,
    });
  });

  apiTest('creating a space with an invalid image fails', async ({ apiClient }) => {
    const response = await apiClient.post('api/spaces/space', {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      body: {
        id: 'api-test-space3',
        name: 'Space with invalid image',
        disabledFeatures: [],
        color: '#cafeba',
        imageUrl: 'invalidImage',
      },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toStrictEqual({
      error: 'Bad Request',
      message: "[request body.imageUrl]: must start with 'data:image'",
      statusCode: 400,
    });
  });
});
