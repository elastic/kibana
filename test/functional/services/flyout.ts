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

export function FlyoutProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');

  class Flyout {
    public async close(dataTestSubj: string): Promise<void> {
      log.debug('Closing flyout', dataTestSubj);
      const flyoutElement = await testSubjects.find(dataTestSubj);
      const closeBtn = await flyoutElement.findByCssSelector('[aria-label*="Close"]');
      await closeBtn.click();
      await retry.waitFor(
        'flyout closed',
        async () => !(await testSubjects.exists(dataTestSubj, { timeout: 1000 }))
      );
    }

    public async ensureClosed(dataTestSubj: string): Promise<void> {
      if (await testSubjects.exists(dataTestSubj, { timeout: 1000 })) {
        await this.close(dataTestSubj);
      }
    }

    public async ensureAllClosed(): Promise<void> {
      const flyoutElements = await find.allByCssSelector('.euiFlyout');

      if (!flyoutElements.length) {
        return;
      }

      for (let i = 0; i < flyoutElements.length; i++) {
        const closeBtn = await flyoutElements[i].findByCssSelector('[aria-label*="Close"]');
        await closeBtn.click();
      }

      await retry.waitFor(
        'all flyouts to be closed',
        async () => (await find.allByCssSelector('.euiFlyout')).length === 0
      );
    }
  }

  return new Flyout();
}
