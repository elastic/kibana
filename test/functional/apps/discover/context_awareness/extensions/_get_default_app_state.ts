/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'unifiedFieldList']);
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');
  const queryBar = getService('queryBar');
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('extension getDefaultAppState', () => {
    afterEach(async () => {
      await kibanaServer.uiSettings.unset('defaultColumns');
    });

    describe('ES|QL mode', () => {
      it('should render default columns and row height', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: {
            esql: 'from my-example-logs',
          },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        const rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        const rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });

      it('should render default columns and row height when switching index patterns', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: {
            esql: 'from my-example-*',
          },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        let columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'Document']);
        await dataGrid.clickGridSettings();
        let rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        let rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(3);
        await monacoEditor.setCodeEditorValue('from my-example-logs');
        await queryBar.clickQuerySubmitButton();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });

      it('should reset default columns and row height when clicking "New"', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: {
            esql: 'from my-example-logs',
          },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.clickFieldListItemRemove('log.level');
        await PageObjects.unifiedFieldList.clickFieldListItemRemove('message');
        let columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'Document']);
        await dataGrid.clickGridSettings();
        await dataGrid.changeRowHeightValue('Single');
        let rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Single');
        await testSubjects.click('discoverNewButton');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        const rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });

      it('should merge and dedup configured default columns with default profile columns', async () => {
        await kibanaServer.uiSettings.update({
          defaultColumns: ['bad_column', 'data_stream.type', 'message'],
        });
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: {
            esql: 'from my-example-logs',
          },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message', 'data_stream.type']);
      });
    });

    describe('data view mode', () => {
      it('should render default columns and row height', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-logs');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        const rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        const rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });

      it('should render default columns and row height when switching data views', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-*');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        let columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'Document']);
        await dataGrid.clickGridSettings();
        let rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        let rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(3);
        await dataViews.switchTo('my-example-logs');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });

      it('should reset default columns and row height when clicking "New"', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-logs');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.clickFieldListItemRemove('log.level');
        await PageObjects.unifiedFieldList.clickFieldListItemRemove('message');
        let columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'Document']);
        await dataGrid.clickGridSettings();
        await dataGrid.changeRowHeightValue('Single');
        let rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Single');
        await testSubjects.click('discoverNewButton');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        const rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });

      it('should merge and dedup configured default columns with default profile columns', async () => {
        await kibanaServer.uiSettings.update({
          defaultColumns: ['bad_column', 'data_stream.type', 'message'],
        });
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-logs');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message', 'data_stream.type']);
      });
    });
  });
}
