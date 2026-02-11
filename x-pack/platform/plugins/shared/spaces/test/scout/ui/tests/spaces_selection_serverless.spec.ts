/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe(
  'Spaces selection',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test('as Viewer - displays the space selection menu in header', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.spaces.navigateToHome();

      const isHeaderVisible = await pageObjects.spaces.isProjectHeaderVisible();
      expect(isHeaderVisible).toBe(true);

      const isSelectorVisible = await pageObjects.spaces.isSpacesSelectorVisible();
      expect(isSelectorVisible).toBe(true);
    });

    test('as Viewer - does not display the manage button in the space selection menu', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.spaces.navigateToHome();

      const isHeaderVisible = await pageObjects.spaces.isProjectHeaderVisible();
      expect(isHeaderVisible).toBe(true);

      await pageObjects.spaces.openSpacesSelector();

      const isManageVisible = await pageObjects.spaces.isManageButtonVisible();
      expect(isManageVisible).toBe(false);
    });

    test('as Admin - displays the space selection menu in header', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.spaces.navigateToHome();

      const isHeaderVisible = await pageObjects.spaces.isProjectHeaderVisible();
      expect(isHeaderVisible).toBe(true);

      const isSelectorVisible = await pageObjects.spaces.isSpacesSelectorVisible();
      expect(isSelectorVisible).toBe(true);
    });

    test('as Admin - displays the manage button in the space selection menu', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.spaces.navigateToHome();

      const isHeaderVisible = await pageObjects.spaces.isProjectHeaderVisible();
      expect(isHeaderVisible).toBe(true);

      await pageObjects.spaces.openSpacesSelector();
      await pageObjects.spaces.waitForManageButton();
    });
  }
);
