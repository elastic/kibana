/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export function TagCloudPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const { header, visChart } = getPageObjects(['header', 'visChart']);

  class TagCloudPage {
    public async selectTagCloudTag(tagDisplayText: string) {
      await testSubjects.click(tagDisplayText);
      await header.waitUntilLoadingHasFinished();
    }

    public async getTextTag() {
      await visChart.waitForVisualization();
      const elements = await find.allByCssSelector('text');
      return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
    }

    public async getTextSizes() {
      const tags = await find.allByCssSelector('text');
      async function returnTagSize(tag: WebElementWrapper) {
        const style = await tag.getAttribute('style');
        const fontSize = style.match(/font-size: ([^;]*);/);
        return fontSize ? fontSize[1] : '';
      }
      return await Promise.all(tags.map(returnTagSize));
    }
  }

  return new TagCloudPage();
}
