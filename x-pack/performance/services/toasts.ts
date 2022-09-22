/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { subj } from '@kbn/test-subj-selector';
import { Page } from 'playwright';

export class ToastsService {
  constructor(private readonly log: ToolingLog, private readonly page: Page) {}

  /**
   * Wait for a toast with some bit of text matching the provided `textSnipped`, then clear
   * it and resolve the promise.
   */
  async waitForAndClear(textSnippet: string) {
    const txt = JSON.stringify(textSnippet);
    this.log.info(`waiting for toast that has the text ${txt}`);
    const toastSel = `.euiToast:has-text(${txt})`;

    const toast = this.page.locator(toastSel);
    await toast.waitFor();

    this.log.info('toast found, closing');

    const close = toast.locator(subj('toastCloseButton'));
    await close.click();

    await toast.waitFor({ state: 'hidden' });
  }
}
