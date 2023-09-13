/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '../../../services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'context']);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    hideAnnouncements: true,
  };

  async function findFirstFieldIcons(element: WebElementWrapper) {
    const fieldIcons = await element.findAllByCssSelector('.kbnFieldIcon svg');

    return await Promise.all(
      fieldIcons.map((fieldIcon) => fieldIcon.getAttribute('aria-label')).slice(0, 10)
    );
  }

  describe('discover data grid field tokens', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should render field tokens correctly', async function () {
      expect(await PageObjects.discover.getHitCount()).to.be('14,004');

      // check the first grid row
      const cell = await dataGrid.getCellElement(0, 3);
      expect(await findFirstFieldIcons(cell)).to.eql([
        'Text',
        'Text',
        'Date',
        'Text',
        'Number',
        'IP address',
        'Text',
        'Geo point',
        'Keyword',
        'Keyword',
      ]);

      // check in the doc viewer
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const docViewer = await testSubjects.find('docTableDetailsFlyout');
      expect(await findFirstFieldIcons(docViewer)).to.eql([
        'Keyword',
        'Keyword',
        'Number',
        'Text',
        'Text',
        'Date',
        'Text',
        'Number',
        'IP address',
        'Text',
      ]);
    });

    it('should render field tokens correctly for ES|QL', async function () {
      await PageObjects.discover.selectTextBaseLang();
      expect(await PageObjects.discover.getHitCount()).to.be('10');

      // check the first grid row
      const cell = await dataGrid.getCellElement(0, 3);
      expect(await findFirstFieldIcons(cell)).to.eql([
        'String',
        'String',
        'Date',
        'String',
        'Number',
        'String',
        'String',
        'String',
        'String',
        'String',
      ]);

      // check in the doc viewer
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const docViewer = await testSubjects.find('docTableDetailsFlyout');
      expect(await findFirstFieldIcons(docViewer)).to.eql([
        'String',
        'String',
        'Date',
        'String',
        'Number',
        'String',
        'String',
        'Unknown field',
        'String',
        'String',
      ]);
    });
  });
}
