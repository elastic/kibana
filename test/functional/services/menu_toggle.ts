/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

interface Options {
  name: string;
  menuTestSubject: string;
  toggleButtonTestSubject: string;
}

export class MenuToggleService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  create(options: Options) {
    const { log, retry, testSubjects } = this;
    const { name, menuTestSubject, toggleButtonTestSubject } = options;

    async function setState(expectedState: boolean) {
      log.debug(
        `setting menu open state [name=${name}] [state=${expectedState ? 'open' : 'closed'}]`
      );

      await retry.try(async () => {
        // if the menu is clearly in the expected state already, bail out quickly if so
        const isOpen = await testSubjects.exists(menuTestSubject, { timeout: 1000 });
        if (isOpen === expectedState) {
          return;
        }

        // toggle the view state by clicking the button
        await testSubjects.click(toggleButtonTestSubject);

        if (expectedState === true) {
          // wait for up to 10 seconds for the menu to show up, otherwise fail and retry
          await testSubjects.existOrFail(menuTestSubject, { timeout: 10000 });
        } else {
          // wait for the form to hide, otherwise fail and retry
          await testSubjects.waitForDeleted(menuTestSubject);
        }
      });
    }

    return {
      async open() {
        await setState(true);
      },

      async close() {
        await setState(false);
      },
    };
  }
}
