/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const { common, discover, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
  ]);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    defaultColumns: ['message', 'extension', 'DestCountry'],
    hideAnnouncements: true,
  };

  describe('discover default columns', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb');
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_logs_tsdb'
      );
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb');
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async function () {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();
    });

    it('should render default columns', async function () {
      expect(await dataGrid.getHeaderFields()).to.eql([
        '@timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);
    });

    it('should render only available default columns after switching data views', async function () {
      expect(await dataGrid.getHeaderFields()).to.eql([
        '@timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);

      await dataViews.switchToAndValidate('Kibana Sample Data Logs (TSDB)');
      await discover.waitUntilSearchingHasFinished();
      await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['timestamp', 'message', 'extension']);

      await dataViews.switchToAndValidate('kibana_sample_data_flights');
      await discover.waitUntilSearchingHasFinished();
      await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['timestamp', 'DestCountry']);

      await dataViews.switchToAndValidate('logstash-*');
      await discover.waitUntilSearchingHasFinished();
      await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'extension']);
    });

    it('should combine selected columns and default columns after switching data views', async function () {
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemRemove('DestCountry');
      await unifiedFieldList.clickFieldListItemRemove('message');
      await discover.waitUntilSearchingHasFinished();

      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'extension', 'bytes']);
      await dataViews.switchToAndValidate('Kibana Sample Data Logs (TSDB)');
      await discover.waitUntilSearchingHasFinished();
      await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql([
        'timestamp',
        'extension',
        'bytes',
        'message',
      ]);

      await dataViews.switchToAndValidate('logstash-*');
      await discover.waitUntilSearchingHasFinished();
      await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'extension', 'bytes']);
    });

    it('should not change columns if discover:modifyColumnsOnSwitch is off', async function () {
      await kibanaServer.uiSettings.update({
        'discover:modifyColumnsOnSwitch': false,
      });
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();

      expect(await dataGrid.getHeaderFields()).to.eql([
        '@timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);

      await dataViews.switchToAndValidate('kibana_sample_data_flights');
      await discover.waitUntilSearchingHasFinished();
      await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql([
        'timestamp',
        'message',
        'extension',
        'DestCountry',
      ]);
    });
  });
}
