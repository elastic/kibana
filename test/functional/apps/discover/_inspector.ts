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
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const inspector = getService('inspector');

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

      await kibanaServer.importExport.load('discover');
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
      const requestStats = await inspector.getTableData();

      expect(getHitCount(requestStats)).to.be('0');
    });

    it('should display request stats with results', async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await inspector.open();
      const requestStats = await inspector.getTableData();

      expect(getHitCount(requestStats)).to.be('500');
    });
  });
}
