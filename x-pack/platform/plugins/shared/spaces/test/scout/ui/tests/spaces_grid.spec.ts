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

// Unique per run/worker so parallel specs (which all create globally-visible
// spaces) can't collide on ids or pollute grid-filtered assertions.
const RUN_ID = randomUUID().slice(0, 8);
// Hyphen-free so the grid's EuiSearchBar treats it as a single literal term (a
// leading `-` in a token is parsed as negation), and so it stays a contiguous
// substring of every space id/name below.
const TOKEN = `grid${RUN_ID}`;
const SPACES = Array.from({ length: 5 }, (_, i) => ({
  id: `${TOKEN}-${i}`,
  name: `${TOKEN} space ${i}`,
}));

test.describe('Spaces Management: List of Spaces', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    for (const { id, name } of SPACES) {
      await apiServices.spaces.create({ id, name });
    }
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.spaces.gotoSpacesGrid();
  });

  test.afterAll(async ({ apiServices }) => {
    for (const { id } of SPACES) {
      await apiServices.spaces.delete(id);
    }
  });

  test('lists all the spaces populated', async ({ pageObjects }) => {
    // Filter to just this run's spaces — the grid lists every space in the
    // deployment, including ones created by other parallel specs.
    await pageObjects.spaces.filterSpacesGrid(TOKEN);

    await expect.poll(async () => await pageObjects.spaces.getSpaceRowCount()).toBe(SPACES.length);

    for (const { id } of SPACES) {
      await expect(pageObjects.spaces.spaceRowLocator(id)).toBeVisible();
    }
  });

  test('does not display the space switcher button on the current space details page', async ({
    pageObjects,
  }) => {
    expect((await pageObjects.spaces.getCurrentSpaceTitle())?.toLowerCase()).toBe('default');

    // Filter first so the default row is on the (single) visible page regardless
    // of how many spaces other parallel specs have created.
    await pageObjects.spaces.filterSpacesGrid('default');
    await pageObjects.spaces.clickSpaceDetailsLink('default');

    expect(await pageObjects.spaces.getDetailsHeaderText()).toContain('default');
    await expect(pageObjects.spaces.switchSpaceButtonLocator()).toBeHidden();
  });

  test('displays the space switcher button on a non-current space details page', async ({
    pageObjects,
  }) => {
    const target = SPACES[0];

    await pageObjects.spaces.filterSpacesGrid(TOKEN);
    await pageObjects.spaces.clickSpaceDetailsLink(target.id);

    expect(await pageObjects.spaces.getDetailsHeaderText()).toContain(target.name);
    await expect(pageObjects.spaces.switchSpaceButtonLocator()).toBeVisible();
  });

  test('switches to a new space using the space switcher button', async ({ pageObjects }) => {
    expect((await pageObjects.spaces.getCurrentSpaceTitle())?.toLowerCase()).toBe('default');

    const target = SPACES[0];

    await pageObjects.spaces.filterSpacesGrid(TOKEN);
    await pageObjects.spaces.clickSpaceDetailsLink(target.id);
    await pageObjects.spaces.clickSwitchSpaceButton();

    await expect
      .poll(async () => (await pageObjects.spaces.getCurrentSpaceTitle())?.toLowerCase())
      .toBe(target.name);
    expect(pageObjects.spaces.getCurrentUrl()).toContain(`/s/${target.id}`);
  });

  test('spaces grid page has no accessibility violations', async ({ page, pageObjects }) => {
    await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();

    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });
});
