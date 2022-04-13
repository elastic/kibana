/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'visualize', 'timePicker']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');

  const STATS_ROW_NAME_INDEX = 0;
  const STATS_ROW_VALUE_INDEX = 1;
  function getHitCount(requestStats: string[][]): string | undefined {
    const hitsCountStatsRow = requestStats.find((statsRow) => {
      return statsRow[STATS_ROW_NAME_INDEX] === 'Hits';
    });

    if (!hitsCountStatsRow) {
      return;
    }

    return hitsCountStatsRow[STATS_ROW_VALUE_INDEX];
  }

  describe('inspect', () => {
    before(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });

      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });

      await PageObjects.common.navigateToApp('discover');
    });

    afterEach(async () => {
      await inspector.close();
    });

    it('should display request stats with no results', async () => {
      await inspector.open();
      await testSubjects.click('inspectorRequestChooser');
      let foundZero = false;
      for (const subj of ['Documents', 'Chart_data']) {
        await testSubjects.click(`inspectorRequestChooser${subj}`);
        if (await testSubjects.exists('inspectorRequestDetailStatistics', { timeout: 500 })) {
          await testSubjects.click(`inspectorRequestDetailStatistics`);
          const requestStatsTotalHits = getHitCount(await inspector.getTableData());
          if (requestStatsTotalHits === '0') {
            foundZero = true;
            break;
          }
        }
      }
      expect(foundZero).to.be(true);
    });

    it('should display request stats with results', async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await inspector.open();
      await testSubjects.click('inspectorRequestChooser');
      await testSubjects.click(`inspectorRequestChooserDocuments`);
      await testSubjects.click(`inspectorRequestDetailStatistics`);
      const requestStats = await inspector.getTableData();

      expect(getHitCount(requestStats)).to.be('500');
    });
  });
}
