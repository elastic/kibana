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

export function MenuToggleProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  interface Options {
    name: string;
    menuTestSubject: string;
    toggleButtonTestSubject: string;
  }

  return class MenuToggle {
    private readonly name: string;
    private readonly menuTestSubject: string;
    private readonly toggleButtonTestSubject: string;

    constructor(options: Options) {
      this.name = options.name;
      this.menuTestSubject = options.menuTestSubject;
      this.toggleButtonTestSubject = options.toggleButtonTestSubject;
    }

    async open() {
      await this.setState(true);
    }

    async close() {
      await this.setState(false);
    }

    private async setState(expectedState: boolean) {
      log.debug(
        `setting menu open state [name=${this.name}] [state=${expectedState ? 'open' : 'closed'}]`
      );

      await retry.try(async () => {
        // if the menu is clearly in the expected state already, bail out quickly if so
        const isOpen = await testSubjects.exists(this.menuTestSubject, { timeout: 1000 });
        if (isOpen === expectedState) {
          return;
        }

        // toggle the view state by clicking the button
        await testSubjects.click(this.toggleButtonTestSubject);

        if (expectedState === true) {
          // wait for up to 10 seconds for the menu to show up, otherwise fail and retry
          await testSubjects.existOrFail(this.menuTestSubject, { timeout: 10000 });
        } else {
          // wait for the form to hide, otherwise fail and retry
          await testSubjects.waitForDeleted(this.menuTestSubject);
        }
      });
    }
  };
}
