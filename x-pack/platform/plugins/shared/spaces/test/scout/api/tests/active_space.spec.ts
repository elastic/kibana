/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../constants';
import { apiTest } from '../fixtures';

apiTest.describe(
  'Get active space',
  {
    tag: tags.deploymentAgnostic,
  },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      await apiServices.spaces.create({ id: 'foo-space' });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete('foo-space');
    });

    apiTest('returns the default space', async ({ apiClient }) => {
      const response = await apiClient.get('internal/spaces/_active_space', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      const { id, name, _reserved } = response.body;
      expect({ id, name, _reserved }).toStrictEqual({
        id: 'default',
        name: 'Default',
        _reserved: true,
      });
    });

    apiTest('returns the default space when explicitly referenced', async ({ apiClient }) => {
      const response = await apiClient.get('s/default/internal/spaces/_active_space', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      const { id, name, _reserved } = response.body;
      expect({ id, name, _reserved }).toStrictEqual({
        id: 'default',
        name: 'Default',
        _reserved: true,
      });
    });

    apiTest('returns the foo space', async ({ apiClient }) => {
      const { body } = await apiClient.get('s/foo-space/internal/spaces/_active_space', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(body).toMatchObject({
        id: 'foo-space',
        name: 'foo-space',
        disabledFeatures: [],
      });
    });

    apiTest('returns 404 when the space is not found', async ({ apiClient }) => {
      const response = await apiClient.get('s/not-found-space/internal/spaces/_active_space', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body).toStrictEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Saved object [space/not-found-space] not found',
      });
    });
  }
);
