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
  const esArchiver = getService('esArchiver');
  const { discover, timePicker, header } = getPageObjects(['discover', 'timePicker', 'header']);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const retry = getService('retry');
  const deployment = getService('deployment');
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');

  describe('discover as defaultRoute', function () {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('can use a saved search as defaultRoute', async function () {
      await kibanaServer.uiSettings.update({
        defaultRoute: '/app/discover#/view/ab12e3c0-f231-11e6-9486-733b1ac9221a',
      });
      await browser.navigateTo(deployment.getHostPort());
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await retry.try(async () => {
        expect(await discover.getCurrentQueryName()).to.be('A Saved Search');
        expect(await discover.getHitCount()).to.be('14,004');
      });
    });

    it('can use a URL with filters as defaultRoute', async function () {
      await kibanaServer.uiSettings.update({
        defaultRoute:
          "/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:'2015-09-19T06:31:44.000Z',to:'2015-09-23T18:31:44.000Z'))&_a=(columns:!(extension,host),dataSource:(dataViewId:'logstash-*',type:dataView),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,field:extension.raw,index:'logstash-*',key:extension.raw,negate:!f,params:(query:jpg),type:phrase),query:(match_phrase:(extension.raw:jpg)))),hideChart:!f,interval:auto,query:(language:lucene,query:media),sort:!(!('@timestamp',desc)))",
      });
      await browser.navigateTo(deployment.getHostPort());
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await retry.try(async () => {
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(await queryBar.getQueryString()).to.be('media');
        expect(await discover.getHitCount()).to.be('9,109');
      });
    });
  });
}
