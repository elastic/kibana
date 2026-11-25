/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { apiTest } from '../fixtures';
import {
  FEATURE_PRIVILEGED_ROLE,
  FEATURE_READ_ROLE,
  NO_INFERENCE_PRIVILEGE_ROLE,
  PUBLIC_FEATURE_SETTINGS_API_PATH,
  PUBLIC_FEATURE_SETTINGS_HEADERS,
  SAMPLE_FEATURES,
} from '../constants';

apiTest.describe(
  'Public feature settings authorization',
  { tag: [...INFERENCE_LOCAL_TAGS] },
  () => {
    let manageHeaders: Record<string, string>;
    let readHeaders: Record<string, string>;
    let noPrivilegeHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      ({ apiKeyHeader: manageHeaders } = await requestAuth.getApiKeyForCustomRole(
        FEATURE_PRIVILEGED_ROLE
      ));
      ({ apiKeyHeader: readHeaders } = await requestAuth.getApiKeyForCustomRole(FEATURE_READ_ROLE));
      ({ apiKeyHeader: noPrivilegeHeaders } = await requestAuth.getApiKeyForCustomRole(
        NO_INFERENCE_PRIVILEGE_ROLE
      ));
    });

    apiTest.afterEach(async ({ apiClient }) => {
      await apiClient.put(PUBLIC_FEATURE_SETTINGS_API_PATH, {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...manageHeaders },
        body: JSON.stringify({ features: [] }),
      });
    });

    apiTest('a user with read access can GET and cannot PUT', async ({ apiClient }) => {
      const readResponse = await apiClient.get(PUBLIC_FEATURE_SETTINGS_API_PATH, {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...readHeaders },
      });
      const writeResponse = await apiClient.put(PUBLIC_FEATURE_SETTINGS_API_PATH, {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...readHeaders },
        body: JSON.stringify({ features: [SAMPLE_FEATURES.agentBuilderAnthropic] }),
      });

      expect(readResponse).toHaveStatusCode(200);
      expect(writeResponse).toHaveStatusCode(403);
    });

    apiTest('a user without the feature privilege cannot GET', async ({ apiClient }) => {
      const response = await apiClient.get(PUBLIC_FEATURE_SETTINGS_API_PATH, {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...noPrivilegeHeaders },
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);
