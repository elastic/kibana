/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function ToastsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  class Toasts {
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
      const titleElement = await testSubjects.findDescendant('euiToastHeader', toast);
      const title: string = await titleElement.getVisibleText();
      const messageElement = await testSubjects.findDescendant('errorToastMessage', toast);
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
      const dismissButton = await testSubjects.findDescendant('toastCloseButton', toast);
      await dismissButton.click();
    }

    public async dismissAllToasts() {
      const list = await this.getGlobalToastList();
      const toasts = await list.findAllByCssSelector(`.euiToast`);
      for (const toast of toasts) {
        await toast.moveMouseTo();
        const dismissButton = await testSubjects.findDescendant('toastCloseButton', toast);
        await dismissButton.click();
      }
    }

    public async getToastElement(index: number) {
      const list = await this.getGlobalToastList();
      return await list.findByCssSelector(`.euiToast:nth-child(${index})`);
    }

    private async getGlobalToastList() {
      return await testSubjects.find('globalToastList');
    }

    public async getToastCount() {
      const list = await this.getGlobalToastList();
      const toasts = await list.findAllByCssSelector(`.euiToast`);
      return toasts.length;
    }
  }

  return new Toasts();
}
