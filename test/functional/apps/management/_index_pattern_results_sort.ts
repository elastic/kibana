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
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result field sort', function describeIndexTests() {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('logstash-*');
    });

    after(async function () {
      return await PageObjects.settings.removeIndexPattern();
    });

    const columns = [
      {
        heading: 'Name',
        first: '@message',
        last: 'xss.raw',
        async selector() {
          const tableRow = await PageObjects.settings.getTableRow(0, 0);
          return await tableRow.getVisibleText();
        },
      },
      {
        heading: 'Type',
        first: '',
        last: 'text',
        async selector() {
          const tableRow = await PageObjects.settings.getTableRow(0, 1);
          return await tableRow.getVisibleText();
        },
      },
    ];

    columns.forEach(function (col) {
      describe('sort by heading - ' + col.heading, function indexPatternCreation() {
        it('should sort ascending', async function () {
          if (col.heading !== 'Name') {
            await PageObjects.settings.sortBy(col.heading);
          }
          const rowText = await col.selector();
          expect(rowText).to.be(col.first);
        });

        it('should sort descending', async function () {
          await PageObjects.settings.sortBy(col.heading);
          const getText = await col.selector();
          expect(getText).to.be(col.last);
        });
      });
    });
    describe('field list pagination', function () {
      const EXPECTED_FIELD_COUNT = 86;
      it('makelogs data should have expected number of fields', async function () {
        await retry.try(async function () {
          const TabCount = await PageObjects.settings.getFieldsTabCount();
          expect(TabCount).to.be('' + EXPECTED_FIELD_COUNT);
        });
      });
    }); // end describe pagination
  }); // end index result field sort
}
