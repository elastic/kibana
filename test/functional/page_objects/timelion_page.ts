/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';
import type { WebElementWrapper } from '../services/lib/web_element_wrapper';

export class TimelionPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');

  public async getSuggestionItemsText() {
    let lists: WebElementWrapper[] = [];
    await this.retry.try(async () => {
      const timelionCodeEditor = await this.testSubjects.find('timelionCodeEditor');
      lists = await timelionCodeEditor.findAllByClassName('monaco-list-row');
      if (lists.length === 0) {
        throw new Error('suggestion list not populated');
      }
    });
    return await Promise.all(lists.map(async (element) => await element.getVisibleText()));
  }

  public async clickSuggestion(suggestionIndex = 0) {
    const timelionCodeEditor = await this.testSubjects.find('timelionCodeEditor');
    const lists = await timelionCodeEditor.findAllByCssSelector('.monaco-list-row');
    if (suggestionIndex > lists.length) {
      throw new Error(
        `Unable to select suggestion ${suggestionIndex}, only ${lists.length} suggestions available.`
      );
    }
    await lists[suggestionIndex].click();
  }
}
