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
  const config = getService('config');
  const filterBar = getService('filterBar');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  const isCcsTest = config.get('esTestCluster.ccs');
  const archiveDirectory = isCcsTest
    ? 'test/functional/fixtures/kbn_archiver/ccs/discover.json'
    : 'test/functional/fixtures/kbn_archiver/discover.json';
  const esNode = isCcsTest
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');

  const defaultIndex = isCcsTest ? 'ftr-remote:logstash-*' : 'logstash-*';

  describe('discover search errors', () => {
    before(async () => {
      await kibanaServer.importExport.load(archiveDirectory);
      await esNode.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await kibanaServer.importExport.unload(archiveDirectory);
      await esNode.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('exception on single shard shows warning and results', async () => {
      await PageObjects.common.navigateToApp('discover');
      await dataViews.switchToAndValidate(defaultIndex);
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await retry.try(async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('14,004');
      });
      await filterBar.addDslFilter(`
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "${defaultIndex.slice(0, defaultIndex.length - 1)}2015.09.20",
                "error_type": "exception",
                "message": "'Watch out!'"
              }
            ]
          }
        }
      }`);

      // Ensure documents are still returned for the successful shards
      await retry.try(async function tryingForTime() {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('9,247');
      });

      // Ensure a warning is shown
      await testSubjects.exists('searchResponseWarningsCallout');
    });

    it('exception on all shards shows error', async () => {
      await PageObjects.common.navigateToApp('discover');
      await dataViews.switchToAndValidate(defaultIndex);
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await retry.try(async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('14,004');
      });
      await filterBar.addDslFilter(`
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "${defaultIndex}",
                "error_type": "exception",
                "message": "'Watch out!'"
              }
            ]
          }
        }
      }`);

      // Ensure an error is shown
      await testSubjects.exists('searchResponseWarningsEmptyPrompt');
    });
  });
}
