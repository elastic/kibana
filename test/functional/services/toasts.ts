/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

    private async getToastElement(index: number) {
      const list = await this.getGlobalToastList();
      return await list.findByCssSelector(`.euiToast:nth-child(${index})`);
    }

    private async getGlobalToastList() {
      return await testSubjects.find('globalToastList');
    }
  }

  return new Toasts();
}
