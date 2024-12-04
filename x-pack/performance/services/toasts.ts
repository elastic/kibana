/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { subj } from '@kbn/test-subj-selector';
import { Page } from '@playwright/test';

import { toMs, type TimeOrMilliseconds } from './lib/time';

export class ToastsService {
  constructor(private readonly log: ToolingLog, private readonly page: Page) {}

  /**
   * Wait for a toast with some bit of text matching the provided `textSnipped`, then clear
   * it and resolve the promise.
   */
  async waitForAndClear(
    textSnippet: string,
    options?: {
      /** How long should we wait for the toast to show up? */
      timeout?: TimeOrMilliseconds;
    }
  ) {
    const txt = JSON.stringify(textSnippet);
    this.log.info(`waiting for toast that has the text ${txt}`);

    const toast = this.page.locator(`.euiToast:has-text(${txt})`);
    await toast.waitFor({ timeout: toMs(options?.timeout ?? '2m') });

    this.log.info('toast found, closing');

    const close = toast.locator(subj('toastCloseButton'));
    await close.click();

    await toast.waitFor({ state: 'hidden' });
  }
}
