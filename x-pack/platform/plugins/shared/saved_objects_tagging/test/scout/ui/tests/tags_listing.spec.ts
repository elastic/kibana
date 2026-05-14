/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';

test.describe('Tags management listing', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ kbnClient, browserAuth, page, kbnUrl, pageObjects }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);

    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.app('management/kibana/tags'));
    await pageObjects.tagManagement.tagsTable.waitForLoaded();
  });

  test.afterEach(async ({ pageObjects }) => {
    await pageObjects.tagManagement.tagsTable.searchForTerm('');
  });

  test('searches by term', async ({ pageObjects }) => {
    const { tagsTable } = pageObjects.tagManagement;

    const searchCases = [
      {
        term: 'my-favorite',
        expectedTagName: 'my-favorite-tag',
        title: 'searches by name fragment',
      },
      {
        term: 'Another awesome',
        expectedTagName: 'tag-2',
        title: 'searches by description keyword',
      },
    ] as const;

    for (const { term, expectedTagName, title } of searchCases) {
      await test.step(title, async () => {
        await tagsTable.searchForTerm(term);

        const displayedTags = await tagsTable.getDisplayedTagsInfo();
        expect(displayedTags).toHaveLength(1);
        expect(displayedTags[0].name).toBe(expectedTagName);
      });
    }
  });
});
