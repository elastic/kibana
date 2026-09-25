/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaCodeEditorWrapper, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const ANONYMIZATION_RULES_FIELD_TEST_SUBJ =
  'management-settings-editField-ai:anonymizationSettings';

spaceTest.describe(
  'Anonymization Settings - Page Display',
  {
    // This page is available in every offering, not just Observability, so it
    // is exercised across stateful classic and every serverless project type.
    tag: [...tags.stateful.classic, ...tags.serverless.all],
  },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.anonymizationSettings.navigateTo();
    });

    spaceTest('should display correct UI elements', async ({ pageObjects }) => {
      await spaceTest.step('should display the Anonymization Settings page title', async () => {
        const pageTitle = pageObjects.anonymizationSettings.getPageTitle();
        await expect(pageTitle).toBeVisible();
      });

      await spaceTest.step('should display the anonymization rules JSON editor field', async () => {
        const rulesField = pageObjects.anonymizationSettings.getAnonymizationRulesField();
        await expect(rulesField).toBeVisible();
      });

      await spaceTest.step('should not display the bottom bar until a change is made', async () => {
        const bottomBar = pageObjects.anonymizationSettings.getBottomBar();
        await expect(bottomBar).toBeHidden();
      });
    });

    spaceTest(
      'should show the unsaved changes bar when the rules are edited, and hide it again on discard',
      async ({ page, pageObjects }) => {
        const codeEditor = new KibanaCodeEditorWrapper(page);

        await spaceTest.step('editing the rules reveals the save/discard bottom bar', async () => {
          await codeEditor.setCodeEditorValueByTestSubj(
            ANONYMIZATION_RULES_FIELD_TEST_SUBJ,
            JSON.stringify({ rules: [] })
          );

          await expect(pageObjects.anonymizationSettings.getBottomBar()).toBeVisible();
          await expect(pageObjects.anonymizationSettings.getSaveButton()).toBeVisible();
        });

        await spaceTest.step('discarding the changes hides the bottom bar again', async () => {
          await pageObjects.anonymizationSettings.getDiscardChangesButton().click();

          await expect(pageObjects.anonymizationSettings.getBottomBar()).toBeHidden();
        });
      }
    );
  }
);
