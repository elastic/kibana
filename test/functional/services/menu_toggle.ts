/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
