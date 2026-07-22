/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  cleanupLogstashOpenInLensDefaults,
  setupLogstashOpenInLensDefaults,
  testData,
} from '../../../fixtures';

const TIMESTAMP_X_AXIS_DIMENSION = {
  dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
  operation: 'date_histogram',
  field: '@timestamp',
} as const;

spaceTest.describe(
  'Lens open in Lens — agg-based Visualize navigation',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(
        testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.AGG_BASED.NAVIGATION
      );
      await setupLogstashOpenInLensDefaults(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      const { visualize } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await visualize.goto();
      await visualize.openSavedVisualization(
        testData.VISUALIZATION_TITLES.OPEN_IN_LENS.AGG_BASED.NAVIGATION_LINE
      );
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await cleanupLogstashOpenInLensDefaults(scoutSpace);
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should navigate between Visualize and Lens',
      async ({ pageObjects: { visualize, lens }, scoutSpace }) => {
        const openInLens = async () => {
          await visualize.clickEditInLensButton();
          await lens.waitForVisualization('xyVisChart');
          expect(await lens.getLayerCount()).toBe(1);
        };

        await spaceTest.step('return with no changes and no modal', async () => {
          await openInLens();
          await lens.goBackToPreviousApp();
          await expect(visualize.getEditInLensButton()).toBeVisible();
        });

        await spaceTest.step('warn and discard after unsaved Lens changes', async () => {
          await openInLens();
          await lens.configureDimension(TIMESTAMP_X_AXIS_DIMENSION);
          await lens.goBackToPreviousApp();
          await expect(lens.getDiscardChangesModal()).toBeVisible();
          await lens.confirmDiscardChangesModal();
          await expect(visualize.getEditInLensButton()).toBeVisible();
        });

        await spaceTest.step('return with no modal after saving in Lens', async () => {
          await openInLens();
          await lens.configureDimension(TIMESTAMP_X_AXIS_DIMENSION);
          await lens.save(`Migrated Viz saved in Lens ${scoutSpace.id}`, {
            addToDashboard: 'none',
          });
          await lens.goBackToPreviousApp();
          await expect(lens.getDiscardChangesModal()).toBeHidden();
          await expect(visualize.getEditInLensButton()).toBeVisible();
        });
      }
    );
  }
);
