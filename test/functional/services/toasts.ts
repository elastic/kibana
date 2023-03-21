/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class ToastsService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');

  /**
   * Returns the title and message of a specific error toast.
   * This method is specific to toasts created via `.addError` since they contain
   * an additional button, that should not be part of the message.
   *
   * @param index The index of the toast (1-based, NOT 0-based!) of the toast. Use first by default.
   * @returns The title and message of the specified error toast.https://github.com/elastic/kibana/issues/17087
   */
  public async getErrorToast(index: number = 1) {
    const toast = await this.getToastElement(index);
    const titleElement = await this.testSubjects.findDescendant('euiToastHeader', toast);
    const title: string = await titleElement.getVisibleText();
    const messageElement = await this.testSubjects.findDescendant('errorToastMessage', toast);
    const message: string = await messageElement.getVisibleText();
    return { title, message };
  }

  /**
   * Dismiss a specific toast from the toast list. Since toasts usually should time out themselves,
   * you only need to call this for permanent toasts (e.g. error toasts).
   *
   * @param index The 1-based index of the toast to dismiss. Use first by default.
   */
  public async dismissToast(index: number = 1) {
    const toast = await this.getToastElement(index);
    await toast.moveMouseTo();
    const dismissButton = await this.testSubjects.findDescendant('toastCloseButton', toast);
    await dismissButton.click();
  }

  public async dismissAllToasts() {
    const list = await this.getGlobalToastList();
    const toasts = await list.findAllByCssSelector(`.euiToast`);

    if (toasts.length === 0) return;

    for (const toast of toasts) {
      await toast.moveMouseTo();

      if (await this.testSubjects.descendantExists('toastCloseButton', toast)) {
        try {
          const dismissButton = await this.testSubjects.findDescendant('toastCloseButton', toast);
          await dismissButton.click();
        } catch (err) {
          // ignore errors
          // toasts are finnicky because they can dismiss themselves right before you close them
        }
      }
    }
  }

  public async getToastElement(index: number) {
    const list = await this.getGlobalToastList();
    return await list.findByCssSelector(`.euiToast:nth-child(${index})`);
  }

  public async getToastContent(index: number) {
    const elem = await this.getToastElement(index);
    return await elem.getVisibleText();
  }

  public async getAllToastElements() {
    const list = await this.getGlobalToastList();
    return await list.findAllByCssSelector(`.euiToast`);
  }

  private async getGlobalToastList() {
    return await this.testSubjects.find('globalToastList');
  }

  public async getToastCount() {
    const list = await this.getGlobalToastList();
    const toasts = await list.findAllByCssSelector(`.euiToast`);
    return toasts.length;
  }
}
