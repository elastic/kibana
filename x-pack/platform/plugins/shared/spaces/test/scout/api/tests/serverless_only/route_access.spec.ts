/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS, COMMON_HEADERS_NO_INTERNAL } from '../../constants';
import { apiTest } from '../../fixtures';

apiTest.describe(
  'Spaces route access',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, samlAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest('#getActiveSpace requires internal header', async ({ apiClient }) => {
      const rejectedResponse = await apiClient.get('internal/spaces/_active_space', {
        headers: { ...COMMON_HEADERS_NO_INTERNAL, ...cookieHeader },
      });

      expect(rejectedResponse.statusCode).toBe(400);
      expect(rejectedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: expect.stringContaining(
          'method [get] exists but is not available with the current configuration'
        ),
      });

      const acceptedResponse = await apiClient.get('internal/spaces/_active_space', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(acceptedResponse.statusCode).toBe(200);
      expect(acceptedResponse.body).toMatchObject({ id: 'default' });
    });

    apiTest('#copyToSpace requires internal header', async ({ apiClient }) => {
      const rejectedResponse = await apiClient.post('api/spaces/_copy_saved_objects', {
        headers: { ...COMMON_HEADERS_NO_INTERNAL, ...adminApiCredentials.apiKeyHeader },
      });

      expect(rejectedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: expect.stringContaining(
          'method [post] exists but is not available with the current configuration'
        ),
      });

      const acceptedResponse = await apiClient.post('api/spaces/_copy_saved_objects', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      });

      expect(acceptedResponse.statusCode).toBe(400);
      expect(acceptedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: '[request body]: expected a plain object value, but found [null] instead.',
      });
    });

    apiTest('#resolveCopyToSpaceErrors requires internal header', async ({ apiClient }) => {
      const rejectedResponse = await apiClient.post(
        'api/spaces/_resolve_copy_saved_objects_errors',
        {
          headers: { ...COMMON_HEADERS_NO_INTERNAL, ...adminApiCredentials.apiKeyHeader },
        }
      );

      expect(rejectedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: expect.stringContaining(
          'method [post] exists but is not available with the current configuration'
        ),
      });

      const acceptedResponse = await apiClient.post(
        'api/spaces/_resolve_copy_saved_objects_errors',
        {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        }
      );

      expect(acceptedResponse.statusCode).toBe(400);
      expect(acceptedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: '[request body]: expected a plain object value, but found [null] instead.',
      });
    });

    apiTest('#updateObjectsSpaces requires internal header', async ({ apiClient }) => {
      const rejectedResponse = await apiClient.post('api/spaces/_update_objects_spaces', {
        headers: { ...COMMON_HEADERS_NO_INTERNAL, ...adminApiCredentials.apiKeyHeader },
      });

      expect(rejectedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: expect.stringContaining(
          'method [post] exists but is not available with the current configuration'
        ),
      });

      const acceptedResponse = await apiClient.post('api/spaces/_update_objects_spaces', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      });

      expect(acceptedResponse.statusCode).toBe(400);
      expect(acceptedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: '[request body]: expected a plain object value, but found [null] instead.',
      });
    });

    apiTest('#getShareableReferences requires internal header', async ({ apiClient }) => {
      const rejectedResponse = await apiClient.post('api/spaces/_get_shareable_references', {
        headers: { ...COMMON_HEADERS_NO_INTERNAL, ...adminApiCredentials.apiKeyHeader },
      });

      expect(rejectedResponse.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: expect.stringContaining(
          'method [post] exists but is not available with the current configuration'
        ),
      });

      const acceptedResponse = await apiClient.post('api/spaces/_get_shareable_references', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        body: { objects: [{ type: 'a', id: 'a' }] },
      });

      expect(acceptedResponse.statusCode).toBe(200);
    });

    apiTest('#disableLegacyUrlAliases is disabled', async ({ apiClient }) => {
      const response = await apiClient.post('api/spaces/_disable_legacy_url_aliases', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      });

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({ statusCode: 404 });
    });
  }
);
