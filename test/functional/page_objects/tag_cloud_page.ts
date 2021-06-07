/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export class TagCloudPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly header = this.ctx.getPageObject('header');
  private readonly visChart = this.ctx.getPageObject('visChart');

  public async selectTagCloudTag(tagDisplayText: string) {
    await this.testSubjects.click(tagDisplayText);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async getTextTag() {
    await this.visChart.waitForVisualization();
    const elements = await this.find.allByCssSelector('text');
    return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
  }

  public async getTextSizes() {
    const tags = await this.find.allByCssSelector('text');
    async function returnTagSize(tag: WebElementWrapper) {
      const style = await tag.getAttribute('style');
      const fontSize = style.match(/font-size: ([^;]*);/);
      return fontSize ? fontSize[1] : '';
    }
    return await Promise.all(tags.map(returnTagSize));
  }
}
