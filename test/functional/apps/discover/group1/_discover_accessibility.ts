/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const { common } = getPageObjects(['common']);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  const hasFocus = async (testSubject: string) => {
    const targetElement = await testSubjects.find(testSubject);
    const activeElement = await find.activeElement();
    return (await targetElement._webElement.getId()) === (await activeElement._webElement.getId());
  };

  describe('discover accessibility', () => {
    before(async () => {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    describe('top nav menu buttons', () => {
      const focusAndPressButton = async (buttonTestSubject: string | WebElementWrapper) => {
        const button =
          typeof buttonTestSubject === 'string'
            ? await testSubjects.find(buttonTestSubject)
            : buttonTestSubject;
        await button.focus();
        await browser.pressKeys(browser.keys.ENTER);
      };

      const expectButtonToLoseAndRegainFocusWhenOverlayIsOpenedAndClosed = async (
        menuButtonTestSubject: string
      ) => {
        await focusAndPressButton(menuButtonTestSubject);
        expect(await hasFocus(menuButtonTestSubject)).to.be(false);
        await browser.pressKeys(browser.keys.ESCAPE);
        expect(await hasFocus(menuButtonTestSubject)).to.be(true);
      };

      it('should return focus to the open button when dismissing the open search flyout', () =>
        expectButtonToLoseAndRegainFocusWhenOverlayIsOpenedAndClosed('discoverOpenButton'));

      it('should return focus to the alerts button when dismissing the alerts popover', () =>
        expectButtonToLoseAndRegainFocusWhenOverlayIsOpenedAndClosed('discoverAlertsButton'));

      it('should return focus to the alerts button when dismissing the create rule flyout', async () => {
        await focusAndPressButton('discoverAlertsButton');
        expect(await hasFocus('discoverAlertsButton')).to.be(false);
        await focusAndPressButton('discoverCreateAlertButton');
        expect(await testSubjects.exists('addRuleFlyoutTitle')).to.be(true);
        await retry.try(async () => {
          await browser.pressKeys(browser.keys.ESCAPE);
          // A bug exists with the create rule flyout where sometimes the confirm modal
          // shows even though the form hasn't been touched, so this works around it
          if (await testSubjects.exists('confirmRuleCloseModal', { timeout: 0 })) {
            await focusAndPressButton(
              await testSubjects.findDescendant(
                'confirmModalConfirmButton',
                await testSubjects.find('confirmRuleCloseModal')
              )
            );
          }
          expect(await hasFocus('discoverAlertsButton')).to.be(true);
        });
      });

      it('should return focus to the share button when dismissing the share popover', () =>
        expectButtonToLoseAndRegainFocusWhenOverlayIsOpenedAndClosed('shareTopNavButton'));

      it('should return focus to the inspect button when dismissing the inspector flyout', () =>
        expectButtonToLoseAndRegainFocusWhenOverlayIsOpenedAndClosed('openInspectorButton'));

      it('should return focus to the save button when dismissing the save modal', () =>
        expectButtonToLoseAndRegainFocusWhenOverlayIsOpenedAndClosed('discoverSaveButton'));
    });
  });
}
