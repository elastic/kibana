/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '@kbn/fleet-plugin/common';
import { test } from '../fixtures';
import {
  MOCK_AWS_PACKAGE_IDENTITY_FEDERATION_SUPPORTED,
  mockAwsPackage,
  navigateToOnboardingStep,
  useOnboardingFeatureFlag,
} from '../helpers/onboarding';

const SERVICE_VARS = {
  elb: {
    enabledDataStreams: ['elb_logs'],
    varsByDataStream: {
      elb_logs: {
        enabledInputs: ['aws-s3'],
        varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::test-bucket' } },
      },
    },
  },
};

test.describe(
  'Onboarding Authenticate and Deploy step — AWS identity federation flag ON',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag({ [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true });

    test.beforeEach(async ({ page }) => {
      await mockAwsPackage(page, MOCK_AWS_PACKAGE_IDENTITY_FEDERATION_SUPPORTED);
    });

    test('offers identity federation as an authentication method', async ({
      browserAuth,
      page,
    }) => {
      await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
        selectedServiceIds: ['elb'],
        serviceVars: SERVICE_VARS,
      });

      await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();
      await expect(page.testSubj.locator('managedIntegrationsSection-description')).toContainText(
        'Utilize AWS Access Keys or Federated Identity'
      );
      await expect(
        page.testSubj.locator('managedIntegrationsSection-preferredMethodRadio')
      ).toBeVisible();
    });
  }
);
