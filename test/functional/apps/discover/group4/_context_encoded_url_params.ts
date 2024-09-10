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

const customDataViewIdParam = 'context-enc:oded-param';
const customDocIdParam = '1+1=2/&?#';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings', 'header']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  describe('encoded URL params in context page', () => {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'context_encoded_param']);
      await PageObjects.common.navigateToApp('settings');
      await es.transport.request({
        path: `/_bulk`,
        method: 'PUT',
        bulkBody: [
          { index: { _index: 'context_encoded_param', _id: customDocIdParam } },
          { '@timestamp': '2015-09-21T09:30:23', name: 'Dmitry' },
        ],
      });
      await PageObjects.settings.createIndexPattern(
        'context_encoded_param',
        '@timestamp',
        true,
        customDataViewIdParam
      );
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    it('should navigate correctly', async () => {
      await PageObjects.discover.selectIndexPattern('context_encoded_param');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitForDocTableLoadingComplete();

      // navigate to the context view
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const [, surroundingActionEl] = await dataGrid.getRowActions({
        isAnchorRow: false,
        rowIndex: 0,
      });
      await surroundingActionEl.click();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const headerElement = await testSubjects.find('contextDocumentSurroundingHeader');

      expect(await headerElement.getVisibleText()).to.be(
        `Documents surrounding #${customDocIdParam}`
      );
    });
  });
}
