/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, discover, header, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');

  describe('extension getRenderAppWrapper', () => {
    describe('ES|QL mode', () => {
      it('should allow clicking message cells to inspect the message', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from my-example-logs | sort @timestamp desc' },
        });
        await common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.clickFieldListItemAdd('message');
        let messageCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        await (await messageCell.findByTestSubject('exampleDataSourceProfileMessage')).click();
        await testSubjects.existOrFail('exampleRootProfileFlyout');
        let message = await testSubjects.find('exampleRootProfileCurrentMessage');
        expect(await message.getVisibleText()).to.be('This is a debug log');
        messageCell = await dataGrid.getCellElementExcludingControlColumns(1, 0);
        await (await messageCell.findByTestSubject('exampleDataSourceProfileMessage')).click();
        await testSubjects.existOrFail('exampleRootProfileFlyout');
        message = await testSubjects.find('exampleRootProfileCurrentMessage');
        expect(await message.getVisibleText()).to.be('This is an error log');
        await testSubjects.click('euiFlyoutCloseButton');
        await testSubjects.missingOrFail('exampleRootProfileFlyout');
      });
    });

    describe('data view mode', () => {
      it('should allow clicking message cells to inspect the message', async () => {
        await common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.clickFieldListItemAdd('message');
        let messageCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        await (await messageCell.findByTestSubject('exampleDataSourceProfileMessage')).click();
        await testSubjects.existOrFail('exampleRootProfileFlyout');
        let message = await testSubjects.find('exampleRootProfileCurrentMessage');
        expect(await message.getVisibleText()).to.be('This is a debug log');
        messageCell = await dataGrid.getCellElementExcludingControlColumns(1, 1);
        await (await messageCell.findByTestSubject('exampleDataSourceProfileMessage')).click();
        await testSubjects.existOrFail('exampleRootProfileFlyout');
        message = await testSubjects.find('exampleRootProfileCurrentMessage');
        expect(await message.getVisibleText()).to.be('This is an error log');
        await testSubjects.click('euiFlyoutCloseButton');
        await testSubjects.missingOrFail('exampleRootProfileFlyout');

        // check Surrounding docs page
        await dataGrid.clickRowToggle();
        const [, surroundingActionEl] = await dataGrid.getRowActions();
        await surroundingActionEl.click();
        await header.waitUntilLoadingHasFinished();
        await browser.refresh();
        await header.waitUntilLoadingHasFinished();

        messageCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        await (await messageCell.findByTestSubject('exampleDataSourceProfileMessage')).click();
        await testSubjects.existOrFail('exampleRootProfileFlyout');
        message = await testSubjects.find('exampleRootProfileCurrentMessage');
        expect(await message.getVisibleText()).to.be('This is a debug log');
        messageCell = await dataGrid.getCellElementExcludingControlColumns(1, 1);
        await (await messageCell.findByTestSubject('exampleDataSourceProfileMessage')).click();
        await testSubjects.existOrFail('exampleRootProfileFlyout');
        message = await testSubjects.find('exampleRootProfileCurrentMessage');
        expect(await message.getVisibleText()).to.be('This is an error log');
        await testSubjects.click('euiFlyoutCloseButton');
        await testSubjects.missingOrFail('exampleRootProfileFlyout');
      });
    });
  });
}
