/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { inspect } from 'util';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const savedObjectInfo = getService('savedObjectInfo');
  const log = getService('log');
  const es = getService('legacyEs');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const inspector = getService('inspector');

  const STATS_ROW_NAME_INDEX = 0;
  const STATS_ROW_VALUE_INDEX = 1;
  function getHitCount(requestStats: string[][]): string | undefined {
    const hitsCountStatsRow = requestStats.find((statsRow) => {
      return statsRow[STATS_ROW_NAME_INDEX] === 'Hits (total)';
    });

    if (!hitsCountStatsRow) {
      return;
    }

    return hitsCountStatsRow[STATS_ROW_VALUE_INDEX];
  }

  const logTypes = (msg: string = '') => async () =>
    log.debug(
      `\n### Saved Object Types In Index: [.kibana] ${msg}: \n${inspect(
        await savedObjectInfo.types(),
        {
          compact: false,
          depth: 99,
          breakLength: 80,
          sorted: true,
        }
      )}`
    );

  const logEsInfo = async () => {
    log.debug(
      // @ts-expect-error
      await es.transport.request({
        path: '/_cat/indices',
        method: 'GET',
      })
    );
    log.debug(
      // @ts-expect-error
      await es.transport.request({
        path: '/_cat/aliases',
        method: 'GET',
      })
    );
  };

  describe('inspect', () => {
    before(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await logEsInfo();

      await kibanaServer.importExport.load(
        'discover',
        { space: undefined },
        // @ts-ignore
        logTypes('[Inspector Test]')
      );
      await esArchiver.loadIfNeeded('logstash_functional');
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

      expect(getHitCount(requestStats)).to.be('14004');
    });
  });
}
