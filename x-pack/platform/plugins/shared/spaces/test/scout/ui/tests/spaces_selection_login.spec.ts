/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);
const SPACE_ID = `login-${RUN_ID}`;
const OTHER_SPACE_ID = `login-${RUN_ID}-other`;

test.describe('Spaces selection: login space selector', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.spaces.create({ id: SPACE_ID, name: `${SPACE_ID} name` });
    await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: `${OTHER_SPACE_ID} name` });
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_ID);
    await apiServices.spaces.delete(OTHER_SPACE_ID);
  });

  test('allows the user to select an initial space from the selector', async ({
    browserAuth,
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();

    await page.goto(kbnUrl.get('/spaces/space_selector'));
    await pageObjects.spaces.waitForSpaceSelector();

    await test.step('space selection page has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="kibanaSpaceSelector"]'],
      });
      expect(violations).toStrictEqual([]);
    });

    await pageObjects.spaces.clickSpaceCard(SPACE_ID);

    await expect.poll(() => pageObjects.spaces.getCurrentUrl()).toContain(`/s/${SPACE_ID}/app/`);
  });

  test('allows the user to switch between spaces from the navigation menu', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.spaces.navigateToHome();

    await test.step('switch to a custom space', async () => {
      await pageObjects.spaces.openSpacesNav();
      await pageObjects.spaces.switchToSpaceFromNav(SPACE_ID);
      await expect.poll(() => pageObjects.spaces.getCurrentUrl()).toContain(`/s/${SPACE_ID}`);
    });

    await test.step('switch to another custom space', async () => {
      await pageObjects.spaces.openSpacesNav();
      await pageObjects.spaces.switchToSpaceFromNav(OTHER_SPACE_ID);
      await expect.poll(() => pageObjects.spaces.getCurrentUrl()).toContain(`/s/${OTHER_SPACE_ID}`);
    });

    await test.step('switch back to the default space', async () => {
      await pageObjects.spaces.openSpacesNav();
      await pageObjects.spaces.switchToSpaceFromNav('default');
      await expect.poll(() => pageObjects.spaces.getCurrentUrl()).not.toContain('/s/');
    });
  });
});
