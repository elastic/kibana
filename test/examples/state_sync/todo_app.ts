/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common']);
  const log = getService('log');
  const deployment = getService('deployment');

  describe('TODO app', () => {
    describe("TODO app with browser history (platform's ScopedHistory)", async () => {
      const appId = 'stateContainersExampleBrowserHistory';
      let base: string;

      before(async () => {
        base = await deployment.getHostPort();
        await PageObjects.common.navigateToApp(appId, { insertTimestamp: false });
      });

      it('links are rendered correctly and state is preserved in links', async () => {
        const getHrefByLinkTestSubj = async (linkTestSubj: string) =>
          (await testSubjects.find(linkTestSubj)).getAttribute('href');

        await expectPathname(await getHrefByLinkTestSubj('filterLinkCompleted'), '/completed');
        await expectPathname(
          await getHrefByLinkTestSubj('filterLinkNotCompleted'),
          '/not-completed'
        );
        await expectPathname(await getHrefByLinkTestSubj('filterLinkAll'), '/');
      });

      it('TODO app state is synced with url, back navigation works', async () => {
        // checking that in initial state checkbox is unchecked and state is synced with url
        expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(false);
        expect(await browser.getCurrentUrl()).to.contain('completed:!f');

        // check the checkbox by clicking the label (clicking checkbox directly fails as it is "no intractable")
        (await find.byCssSelector('label[for="0"]')).click();

        // wait for react to update dom and checkbox in checked state
        await retry.tryForTime(1000, async () => {
          await expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(true);
        });
        // checking that url is updated with checked state
        expect(await browser.getCurrentUrl()).to.contain('completed:!t');

        // checking back and forward button
        await browser.goBack();
        expect(await browser.getCurrentUrl()).to.contain('completed:!f');
        await retry.tryForTime(1000, async () => {
          await expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(false);
        });

        await browser.goForward();
        expect(await browser.getCurrentUrl()).to.contain('completed:!t');
        await retry.tryForTime(1000, async () => {
          await expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(true);
        });
      });

      it('links navigation works', async () => {
        // click link to filter only not completed
        await testSubjects.click('filterLinkNotCompleted');
        await expectPathname(await browser.getCurrentUrl(), '/not-completed');
        // checkbox should be missing because it is "completed"
        await testSubjects.missingOrFail('todoCheckbox-0');
      });

      /**
       * Parses app's scoped pathname from absolute url and asserts it against `expectedPathname`
       * Also checks that hashes are equal (detail of todo app that state is rendered in links)
       * @param absoluteUrl
       * @param expectedPathname
       */
      async function expectPathname(absoluteUrl: string, expectedPathname: string) {
        const scoped = await getScopedUrl(absoluteUrl);
        const [pathname, newHash] = scoped.split('#');
        expect(pathname).to.be(expectedPathname);
        const [, currentHash] = (await browser.getCurrentUrl()).split('#');
        expect(newHash.replace(/%27/g, "'")).to.be(currentHash.replace(/%27/g, "'"));
      }

      /**
       * Get's part of url scoped to this app (removed kibana's host and app's pathname)
       * @param url - absolute url
       */
      async function getScopedUrl(url: string): Promise<string> {
        expect(url).to.contain(base);
        expect(url).to.contain(appId);
        const scopedUrl = url.slice(url.indexOf(appId) + appId.length);
        expect(scopedUrl).not.to.contain(appId); // app id in url only once
        return scopedUrl;
      }
    });

    describe('TODO app with hash history ', async () => {
      before(async () => {
        await PageObjects.common.navigateToApp('stateContainersExampleHashHistory', {
          insertTimestamp: false,
        });
      });

      it('Links are rendered correctly and state is preserved in links', async () => {
        const getHrefByLinkTestSubj = async (linkTestSubj: string) =>
          (await testSubjects.find(linkTestSubj)).getAttribute('href');
        await expectHashPathname(await getHrefByLinkTestSubj('filterLinkCompleted'), '/completed');
        await expectHashPathname(
          await getHrefByLinkTestSubj('filterLinkNotCompleted'),
          '/not-completed'
        );
        await expectHashPathname(await getHrefByLinkTestSubj('filterLinkAll'), '/');
      });

      it('TODO app state is synced with url, back navigation works', async () => {
        // checking that in initial state checkbox is unchecked and state is synced with url
        expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(false);
        expect(await browser.getCurrentUrl()).to.contain('completed:!f');
        // check the checkbox by clicking the label (clicking checkbox directly fails as it is "no intractable")
        (await find.byCssSelector('label[for="0"]')).click();

        // wait for react to update dom and checkbox in checked state
        await retry.tryForTime(1000, async () => {
          await expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(true);
        });
        // checking that url is updated with checked state
        expect(await browser.getCurrentUrl()).to.contain('completed:!t');

        // checking back and forward button
        await browser.goBack();
        expect(await browser.getCurrentUrl()).to.contain('completed:!f');
        await retry.tryForTime(1000, async () => {
          await expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(false);
        });

        await browser.goForward();
        expect(await browser.getCurrentUrl()).to.contain('completed:!t');
        await retry.tryForTime(1000, async () => {
          await expect(await testSubjects.isChecked('todoCheckbox-0')).to.be(true);
        });
      });

      it('links navigation works', async () => {
        // click link to filter only not completed
        await testSubjects.click('filterLinkNotCompleted');
        await expectHashPathname(await browser.getCurrentUrl(), '/not-completed');
        // checkbox should be missing because it is "completed"
        await testSubjects.missingOrFail('todoCheckbox-0');
      });

      /**
       * Parses app's pathname in hash from absolute url and asserts it against `expectedPathname`
       * Also checks that queries in hashes are equal (detail of todo app that state is rendered in links)
       * @param absoluteUrl
       * @param expectedPathname
       */
      async function expectHashPathname(hash: string, expectedPathname: string) {
        log.debug(`expect hash pathname ${hash} to be ${expectedPathname}`);
        const hashPath = hash.split('#')[1];
        const [hashPathname, hashQuery] = hashPath.split('?');
        const [, currentHash] = (await browser.getCurrentUrl()).split('#');
        const [, currentHashQuery] = currentHash.split('?');
        expect(currentHashQuery.replace(/%27/g, "'")).to.be(hashQuery.replace(/%27/g, "'"));
        expect(hashPathname).to.be(expectedPathname);
      }
    });
  });
}
