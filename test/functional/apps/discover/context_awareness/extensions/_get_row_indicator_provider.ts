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
  const { common, timePicker, discover, header } = getPageObjects([
    'common',
    'timePicker',
    'discover',
    'header',
  ]);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');
  const dataViews = getService('dataViews');

  describe('extension getRowIndicatorProvider', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('should not render log.level row indicators for logs data source without a log.level field', async () => {
      const state = kbnRison.encode({
        dataSource: { type: 'esql' },
        query: { esql: 'from logstash* | sort @timestamp desc' },
      });
      await common.navigateToActualUrl('discover', `?_a=${state}`, {
        ensureCurrentUrl: false,
      });
      await discover.waitUntilSearchingHasFinished();
      await timePicker.setDefaultAbsoluteRange();
      await discover.waitUntilSearchingHasFinished();
      // logstash does not have log.level field, so the color indicator should not be rendered
      await testSubjects.existOrFail('euiDataGridBody');
      await testSubjects.missingOrFail('dataGridHeaderCell-colorIndicator');

      // switch the time frame back
      await browser.goBack();
      await discover.waitUntilSearchingHasFinished();
    });

    it('should not render log.level row indicators if not a logs data source', async () => {
      const state = kbnRison.encode({
        dataSource: { type: 'esql' },
        query: { esql: 'from my-example* | sort @timestamp desc' },
      });
      await common.navigateToActualUrl('discover', `?_a=${state}`, {
        ensureCurrentUrl: false,
      });
      await discover.waitUntilSearchingHasFinished();
      // my-example* has a log.level field, but it's not matching the logs profile, so the color indicator should not be rendered
      await testSubjects.existOrFail('euiDataGridBody');
      await testSubjects.missingOrFail('dataGridHeaderCell-colorIndicator');
    });

    it('should render log.level row indicators', async () => {
      const state = kbnRison.encode({
        dataSource: { type: 'esql' },
        query: {
          esql: 'from my-example-logs,logstash* | sort @timestamp desc | where `log.level` is not null',
        },
      });
      await common.navigateToActualUrl('discover', `?_a=${state}`, {
        ensureCurrentUrl: false,
      });
      await discover.waitUntilSearchingHasFinished();
      // in this case it's matching the logs data source profile and has a log.level field, so the color indicator should be rendered
      await testSubjects.existOrFail('dataGridHeaderCell-colorIndicator');
      const firstCell = await dataGrid.getCellElement(0, 0);
      const firstColorIndicator = await firstCell.findByTestSubject(
        'unifiedDataTableRowColorIndicatorCell'
      );
      expect(await firstColorIndicator.getComputedStyle('background-color')).to.be(
        'rgba(190, 207, 227, 1)'
      );
      expect(await firstColorIndicator.getAttribute('title')).to.be('Debug');

      const secondCell = await dataGrid.getCellElement(1, 0);
      const secondColorIndicator = await secondCell.findByTestSubject(
        'unifiedDataTableRowColorIndicatorCell'
      );
      expect(await secondColorIndicator.getComputedStyle('background-color')).to.be(
        'rgba(223, 147, 82, 1)'
      );
      expect(await secondColorIndicator.getAttribute('title')).to.be('Error');
    });

    it('should render log.level row indicators on Surrounding documents page', async () => {
      await common.navigateToApp('discover');
      await dataViews.switchTo('my-example-logs,logstash*');
      await discover.waitUntilSearchingHasFinished();
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const [, surroundingActionEl] = await dataGrid.getRowActions();
      await surroundingActionEl.click();
      await header.waitUntilLoadingHasFinished();

      let anchorCell = await dataGrid.getCellElement(0, 0);
      let anchorColorIndicator = await anchorCell.findByTestSubject(
        'unifiedDataTableRowColorIndicatorCell'
      );
      expect(await anchorColorIndicator.getAttribute('title')).to.be('Debug');
      expect(await anchorColorIndicator.getComputedStyle('background-color')).to.be(
        'rgba(190, 207, 227, 1)'
      );

      let nextCell = await dataGrid.getCellElement(1, 0);
      let nextColorIndicator = await nextCell.findByTestSubject(
        'unifiedDataTableRowColorIndicatorCell'
      );
      expect(await nextColorIndicator.getAttribute('title')).to.be('Error');
      expect(await nextColorIndicator.getComputedStyle('background-color')).to.be(
        'rgba(223, 147, 82, 1)'
      );

      await browser.refresh();
      await header.waitUntilLoadingHasFinished();

      anchorCell = await dataGrid.getCellElement(0, 0);
      anchorColorIndicator = await anchorCell.findByTestSubject(
        'unifiedDataTableRowColorIndicatorCell'
      );
      expect(await anchorColorIndicator.getAttribute('title')).to.be('Debug');
      expect(await anchorColorIndicator.getComputedStyle('background-color')).to.be(
        'rgba(190, 207, 227, 1)'
      );

      nextCell = await dataGrid.getCellElement(1, 0);
      nextColorIndicator = await nextCell.findByTestSubject(
        'unifiedDataTableRowColorIndicatorCell'
      );
      expect(await nextColorIndicator.getAttribute('title')).to.be('Error');
      expect(await nextColorIndicator.getComputedStyle('background-color')).to.be(
        'rgba(223, 147, 82, 1)'
      );
    });
  });
}
