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

export function ToastsProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  class Toasts {
    async verify(selector) {
      // We may need to wait for the toast to appear.
      await retry.try(async () => {
        await testSubjects.existOrFail(selector);
      });
    }

    async dismiss(selector) {
      // We may need to wait for the close button to fade-in and become clickable when the mouse
      // hovers over it.
      await retry.try(async () => {
        await testSubjects.click(`${selector} closeToastButton`);
        await testSubjects.notExistOrFail(`${selector} closeToastButton`);
      });
    }

    async verifyAndDismiss(selector) {
      // Make sure the toast exists, indicating a certain outcome to an async action, and then
      // dismiss it to keep the UI uncluttered.
      await this.verify(selector);
      await this.dismiss(selector);
    }
  }

  return new Toasts();
}
