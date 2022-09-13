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
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings', 'header']);
  const es = getService('es');
  const security = getService('security');

  const createIndex = (indexName: string) => {
    return es.transport.request({
      path: `/${indexName}/_doc/1`,
      method: 'PUT',
      body: {
        username: 'Dmitry',
        '@timestamp': '2015-09-21T09:30:23',
        message: 'hello',
      },
    });
  };

  describe('discover data grid row navigation', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'similar_index', 'similar_index_two']);
      await PageObjects.common.navigateToApp('settings');

      await createIndex('similar_index');
      await createIndex('similar_index_two');

      await PageObjects.settings.createIndexPattern('similar_index*', '@timestamp', true);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    it('should navigate through rows with the same id but different indices correctly', async () => {
      await PageObjects.discover.selectIndexPattern('similar_index*');

      await dataGrid.clickRowToggle();
      const indexBeforePaginating = await testSubjects.getVisibleText(
        'tableDocViewRow-_index-value'
      );
      expect(indexBeforePaginating).to.be('similar_index');

      await testSubjects.click('pagination-button-next');
      const indexAfterPaginating = await testSubjects.getVisibleText(
        'tableDocViewRow-_index-value'
      );
      expect(indexAfterPaginating).to.be('similar_index_two');
    });
  });
}
