/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ENABLE_IAC_PROVISIONER_FLAG } from '../../../../common/constants';
import { apiTest, testData } from '../fixtures';

/**
 * Sequential suite: feature-flag overrides are server-wide, so this lives in
 * its own file (Scout allows one root describe per spec).
 */
apiTest.describe(
  'Fleet IaC Provisioner render route when the feature flag is off',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [ENABLE_IAC_PROVISIONER_FLAG]: false,
        },
      });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [ENABLE_IAC_PROVISIONER_FLAG]: false,
        },
      });
    });

    apiTest(
      'returns 404 with IaC Provisioner is not enabled for an authorized render request',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.FLEET_READ_ROLE);

        const response = await apiClient.post(testData.RENDER_TEMPLATE_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: {
            provider: 'aws',
            flow: 'cloud_connector',
            integrations: [{ name: 'cloud_security_posture', policyTemplates: ['cspm'] }],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
        expect(response.body.message).toBe('IaC Provisioner is not enabled');
      }
    );
  }
);
