/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class TagCloudPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly header = this.ctx.getPageObject('header');

  public async selectTagCloudTag(tagDisplayText: string) {
    const elements = await this.find.allByCssSelector('text');
    const targetElement = elements.find(
      async (element) => (await element.getVisibleText()) === tagDisplayText
    );
    await targetElement?.click();
    await this.header.waitUntilLoadingHasFinished();
  }

  public async getTextTagByElement(webElement: WebElementWrapper) {
    const elements = await webElement.findAllByCssSelector('text');
    return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
  }

  public async getTextTag() {
    const elements = await this.find.allByCssSelector('text');
    return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
  }

  public async getTextSizes() {
    const tags = await this.find.allByCssSelector('text');
    async function returnTagSize(tag: WebElementWrapper) {
      const style = await tag.getAttribute('style');
      const fontSize = style?.match(/font-size: ([^;]*);/);
      return fontSize ? fontSize[1] : '';
    }
    return await Promise.all(tags.map(returnTagSize));
  }
}
