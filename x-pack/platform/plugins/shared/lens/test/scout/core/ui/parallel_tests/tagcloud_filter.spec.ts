/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

spaceTest.describe('Lens tag cloud filter', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'renders tags, filters from a tag click, and narrows the cloud',
    async ({ page, pageObjects }) => {
      const { lens, filterBar } = pageObjects;

      await lens.switchToVisualization('lnsTagcloud', { search: 'Tag cloud' });

      await lens.configureDimension({
        dimension: 'lnsTagcloud_tagDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
        keepOpen: true,
      });
      await lens.setTermsNumberOfValues(5);
      await lens.closeDimensionEditor();

      await lens.configureDimension({
        dimension: 'lnsTagcloud_valueDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.waitForVisualization('tagCloudVisualization');
      // Avoid picking up tags in the suggestion panel.
      await lens.closeSuggestionPanel();

      const { violations: workspaceViolations } = await page.checkA11y({
        include: ['[data-test-subj="lnsApp"]'],
      });
      expect(workspaceViolations).toHaveLength(0);

      let renderedTagToFilter = '';

      await spaceTest.step('render tag cloud', async () => {
        const tagLabels = await lens.getTagCloudTexts();
        expect(tagLabels.length).toBeGreaterThan(3);

        const filterableTags = tagLabels.filter((tag) => tag !== 'Other');
        expect(
          filterableTags.length,
          `Expected at least one filterable tag, got: ${tagLabels.join(', ')}`
        ).toBeGreaterThan(0);
        renderedTagToFilter = filterableTags[0];
      });

      await spaceTest.step('add filter from clicking on tag', async () => {
        await lens.selectTagCloudTag(renderedTagToFilter);
        // Filter bar state is not a locator — poll until the click-to-filter lands.
        await expect
          .poll(async () => filterBar.hasFilter({ field: 'ip', value: renderedTagToFilter }))
          .toBe(true);
      });

      await spaceTest.step('filter results by filter bar', async () => {
        await lens.waitForVisualization('tagCloudVisualization');
        await expect
          .poll(async () => {
            const filteredTags = await lens.getTagCloudTexts();
            return filteredTags.length;
          })
          .toBeLessThan(2);
        const filteredTags = await lens.getTagCloudTexts();
        expect(filteredTags.every((tag) => tag === renderedTagToFilter)).toBe(true);
      });
    }
  );
});
