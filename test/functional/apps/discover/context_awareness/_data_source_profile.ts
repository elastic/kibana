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
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, discover, unifiedFieldList, dashboard, header, timePicker } = getPageObjects([
    'common',
    'discover',
    'unifiedFieldList',
    'dashboard',
    'header',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');
  const monacoEditor = getService('monacoEditor');
  const ebtUIHelper = getService('kibana_ebt_ui');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('data source profile', () => {
    describe('telemetry', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      });

      after(async () => {
        await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      });

      it('should set EBT context for telemetry events with default profile', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilSearchingHasFinished();
        await monacoEditor.setCodeEditorValue('from my-example-* | sort @timestamp desc');
        await ebtUIHelper.setOptIn(true);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['performance_metric'],
          withTimeoutMs: 500,
        });

        expect(events[events.length - 1].context.dscProfiles).to.eql([
          'example-root-profile',
          'default-data-source-profile',
        ]);
      });

      it('should set EBT context for telemetry events when example profile and reset', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilSearchingHasFinished();
        await monacoEditor.setCodeEditorValue('from my-example-logs | sort @timestamp desc');
        await ebtUIHelper.setOptIn(true);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['performance_metric'],
          withTimeoutMs: 500,
        });

        expect(events[events.length - 1].context.dscProfiles).to.eql([
          'example-root-profile',
          'example-data-source-profile',
        ]);

        // should reset the profiles when navigating away from Discover
        await testSubjects.click('logo');
        await retry.waitFor('home page to open', async () => {
          return (await testSubjects.getVisibleText('euiBreadcrumb')) === 'Home';
        });
        await testSubjects.click('addSampleData');

        await retry.try(async () => {
          const eventsAfter = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
            eventTypes: ['click'],
            withTimeoutMs: 500,
          });

          expect(eventsAfter[eventsAfter.length - 1].context.dscProfiles).to.eql([]);
        });
      });

      it('should not set EBT context for embeddables', async () => {
        await dashboard.navigateToApp();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await timePicker.setDefaultAbsoluteRange();
        await dashboardAddPanel.addSavedSearch('A Saved Search');
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        const rows = await dataGrid.getDocTableRows();
        expect(rows.length).to.be.above(0);
        await testSubjects.click('dashboardEditorMenuButton');

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['click'],
          withTimeoutMs: 500,
        });

        expect(events.every((event) => !(event.context.dscProfiles as string[])?.length)).to.be(
          true
        );
      });
    });

    describe('ES|QL mode', () => {
      describe('cell renderers', () => {
        it('should render custom @timestamp but not custom log.level', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from my-example-* | sort @timestamp desc' },
          });
          await common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await discover.waitUntilSearchingHasFinished();
          await unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp');
          expect(timestamps).to.have.length(6);
          expect(await timestamps[0].getVisibleText()).to.be('2024-06-10T16:30:00.000Z');
          expect(await timestamps[5].getVisibleText()).to.be('2024-06-10T14:00:00.000Z');
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel', 2500);
          expect(logLevels).to.have.length(0);
        });

        it('should render custom @timestamp and custom log.level', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from my-example-logs | sort @timestamp desc' },
          });
          await common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await discover.waitUntilSearchingHasFinished();
          await unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp');
          expect(timestamps).to.have.length(3);
          expect(await timestamps[0].getVisibleText()).to.be('2024-06-10T16:00:00.000Z');
          expect(await timestamps[2].getVisibleText()).to.be('2024-06-10T14:00:00.000Z');
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel');
          expect(logLevels).to.have.length(3);
          expect(await logLevels[0].getVisibleText()).to.be('Debug');
          expect(await logLevels[2].getVisibleText()).to.be('Info');
        });
      });

      describe('doc viewer extension', () => {
        it('should not render custom doc viewer view', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from my-example-* | sort @timestamp desc' },
          });
          await common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await discover.waitUntilSearchingHasFinished();
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          await testSubjects.existOrFail('docViewerTab-doc_view_table');
          await testSubjects.existOrFail('docViewerTab-doc_view_source');
          await testSubjects.missingOrFail('docViewerTab-doc_view_example');
          expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be('Result');
        });

        it('should render custom doc viewer view', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from my-example-logs | sort @timestamp desc' },
          });
          await common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await discover.waitUntilSearchingHasFinished();
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          await testSubjects.existOrFail('docViewerTab-doc_view_table');
          await testSubjects.existOrFail('docViewerTab-doc_view_source');
          await testSubjects.existOrFail('docViewerTab-doc_view_example');
          expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be('Record #0');
        });
      });
    });

    describe('data view mode', () => {
      describe('cell renderers', () => {
        it('should render custom @timestamp but not custom log.level', async () => {
          await common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await dataViews.switchTo('my-example-*');
          await discover.waitUntilSearchingHasFinished();
          await unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp');
          expect(timestamps).to.have.length(6);
          expect(await timestamps[0].getVisibleText()).to.be('2024-06-10T16:30:00.000Z');
          expect(await timestamps[5].getVisibleText()).to.be('2024-06-10T14:00:00.000Z');
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel', 2500);
          expect(logLevels).to.have.length(0);
        });

        it('should render custom @timestamp and custom log.level', async () => {
          await common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await dataViews.switchTo('my-example-logs');
          await discover.waitUntilSearchingHasFinished();
          await unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp');
          expect(timestamps).to.have.length(3);
          expect(await timestamps[0].getVisibleText()).to.be('2024-06-10T16:00:00.000Z');
          expect(await timestamps[2].getVisibleText()).to.be('2024-06-10T14:00:00.000Z');
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel');
          expect(logLevels).to.have.length(3);
          expect(await logLevels[0].getVisibleText()).to.be('Debug');
          expect(await logLevels[2].getVisibleText()).to.be('Info');
        });
      });

      describe('doc viewer extension', () => {
        it('should not render custom doc viewer view', async () => {
          await common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await dataViews.switchTo('my-example-*');
          await discover.waitUntilSearchingHasFinished();
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          await testSubjects.existOrFail('docViewerTab-doc_view_table');
          await testSubjects.existOrFail('docViewerTab-doc_view_source');
          await testSubjects.missingOrFail('docViewerTab-doc_view_example');
          expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be('Document');
        });

        it('should render custom doc viewer view', async () => {
          await common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await dataViews.switchTo('my-example-logs');
          await discover.waitUntilSearchingHasFinished();
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          await testSubjects.existOrFail('docViewerTab-doc_view_table');
          await testSubjects.existOrFail('docViewerTab-doc_view_source');
          await testSubjects.existOrFail('docViewerTab-doc_view_example');
          expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be(
            'Record #my-example-logs::XdQFDpABfGznVC1bCHLo::'
          );
        });
      });
    });
  });
}
