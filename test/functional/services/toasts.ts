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

import { TestWrapper } from 'typings';

export function ToastsProvider({ getService }: TestWrapper) {
  const testSubjects = getService<any>('testSubjects');

  class Toasts {
    public async getErrorToast(index: number = 1) {
      const toast = await this.getToastElement(index);
      const titleElement = await testSubjects.findDescendant('euiToastHeader', toast);
      const title: string = await titleElement.getVisibleText();
      const messageElement = await testSubjects.findDescendant('errorToastMessage', toast);
      const message: string = await messageElement.getVisibleText();
      return { title, message };
    }

    public async dismissToast(index: number = 1) {
      const toast = await this.getToastElement(index);
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
