/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const filterBar = getService('filterBar');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const dataViews = getService('dataViews');

  const esArchiver = getService('esArchiver');
  const remoteEsArchiver = getService('remoteEsArchiver' as 'esArchiver');

  describe('discover search CCS timeout', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await remoteEsArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await kibanaServer.uiSettings.replace({
        'search:timeout': 3000,
      });
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await remoteEsArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover.json');
      await kibanaServer.uiSettings.unset('search:timeout');
    });

    it('timeout on single shard shows warning and results', async () => {
      await PageObjects.common.navigateToApp('discover');
      await dataViews.createFromSearchBar({
        name: 'ftr-remote:logstash-*,logstash-*',
        hasTimeField: false,
        adHoc: true,
      });

      // Add a stall time to the remote indices
      await filterBar.addDslFilter(`
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "*:*",
                "error_type": "exception",
                "message": "'Watch out!'",
                "stall_time_seconds": 5
              }
            ]
          }
        }
      }`);

      // Warning callout is shown
      await testSubjects.exists('searchResponseWarningsCallout');

      // Timed out error notification is shown
      const { title } = await toasts.getErrorByIndex(1, true);
      expect(title).to.be('Timed out');

      // View cluster details shows timed out
      await testSubjects.click('searchResponseWarningsViewDetails');
      await testSubjects.click('viewDetailsContextMenu');
      await testSubjects.click('inspectorRequestToggleClusterDetailsftr-remote');
      const txt = await testSubjects.getVisibleText('inspectorRequestClustersDetails');
      expect(txt).to.be('Request timed out before completion. Results may be incomplete or empty.');

      // Ensure documents are still returned for the successful shards
      await retry.try(async function tryingForTime() {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('14,004');
      });
    });
  });
}
