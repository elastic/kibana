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

export function FlyoutProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');

  class Flyout {
    async close(testSubj) {
      log.debug('Closing flyout', testSubj);
      const flyoutElement = await testSubjects.find(testSubj);
      const closeBtn = await flyoutElement.findByCssSelector('[aria-label*="Close"]');
      await closeBtn.click();
      await retry.waitFor('flyout closed', async () => !await testSubjects.exists(testSubj));
    }

    async ensureClosed(testSubj) {
      if (await testSubjects.exists(testSubj)) {
        await this.close(testSubj);
      }
    }

    async ensureAllClosed() {
      const flyoutElements = await find.allByCssSelector('.euiFlyout');

      if (!flyoutElements.length) {
        return;
      }

      await Promise.all(flyoutElements.map(async (flyoutElement) => {
        const closeBtn = await flyoutElement.findByCssSelector('[aria-label*="Close"]');
        await closeBtn.click();
      }));

      await retry.waitFor('all flyouts to be closed', async () => (
        (await find.allByCssSelector('.euiFlyout')).length === 0
      ));
    }
  }

  return new Flyout();
}
