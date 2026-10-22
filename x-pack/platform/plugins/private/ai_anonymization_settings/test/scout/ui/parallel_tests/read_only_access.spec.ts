/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

// Advanced Settings read plus the connector privileges the page needs, and nothing that saves.
const ADVANCED_SETTINGS_READER_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { advancedSettings: ['read'], actions: ['all'] },
      spaces: ['*'],
    },
  ],
};

spaceTest.describe(
  'Anonymization Settings - read-only access',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(ADVANCED_SETTINGS_READER_ROLE);
      await pageObjects.anonymizationSettings.navigateTo();
    });

    spaceTest(
      'shows the settings but does not let the user change them',
      async ({ pageObjects }) => {
        const anonymization = pageObjects.anonymizationSettings;

        await spaceTest.step('explains why nothing is editable', async () => {
          await expect(anonymization.getReadOnlyCallout()).toBeVisible();
          await expect(anonymization.getBuiltInPatternsTable()).toBeVisible();
        });

        await spaceTest.step('disables the master switch', async () => {
          await expect(anonymization.getHeaderMaskingSwitch()).toBeDisabled();
        });

        await spaceTest.step('disables adding custom patterns', async () => {
          await anonymization.goToTab('custom');
          await expect(anonymization.getAddPatternButton()).toBeDisabled();
        });

        await spaceTest.step(
          'hides the pattern tester, whose endpoint needs the save privilege',
          async () => {
            await expect(anonymization.getTesterTab()).toBeHidden();
          }
        );

        await spaceTest.step('disables the failure-mode choice', async () => {
          await anonymization.goToTab('settings');
          await expect(anonymization.getSettingsMaskingEnabledSwitch()).toBeDisabled();
          await expect(
            anonymization.getOnFailureRadioGroup().getByRole('radio', { name: /Block the request/ })
          ).toBeDisabled();
        });
      }
    );
  }
);
