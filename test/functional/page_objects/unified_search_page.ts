/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class UnifiedSearchPageObject extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  public async closeTour() {
    const tourPopoverIsOpen = await this.testSubjects.exists('dataViewPickerTourLink');
    if (tourPopoverIsOpen) {
      await this.testSubjects.click('dataViewPickerTourLink');
    }
  }

  public async closeTourPopoverByLocalStorage() {
    await this.browser.setLocalStorageItem('data.newDataViewMenu', 'true');
    await this.browser.refresh();
  }
}
