/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class UnifiedSearchPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  public async switchDataView(switchButtonSelector: string, dataViewTitle: string) {
    await this.testSubjects.click(switchButtonSelector);

    const indexPatternSwitcher = await this.testSubjects.find('indexPattern-switcher', 500);
    await this.testSubjects.setValue('indexPattern-switcher--input', dataViewTitle);
    await (await indexPatternSwitcher.findByCssSelector(`[title="${dataViewTitle}"]`)).click();

    await this.retry.waitFor(
      'wait for updating switcher',
      async () => (await this.getSelectedDataView(switchButtonSelector)) === dataViewTitle
    );
  }

  public async getSelectedDataView(switchButtonSelector: string) {
    let visibleText = '';

    await this.retry.waitFor('wait for updating switcher', async () => {
      visibleText = await this.testSubjects.getVisibleText(switchButtonSelector);
      return Boolean(visibleText);
    });

    return visibleText;
  }
}
