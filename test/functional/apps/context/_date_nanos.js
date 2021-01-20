/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

const TEST_INDEX_PATTERN = 'date-nanos';
const TEST_DEFAULT_CONTEXT_SIZE = 1;
const TEST_STEP_SIZE = 3;

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const docTable = getService('docTable');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'context', 'timePicker', 'discover']);
  const esArchiver = getService('esArchiver');

  describe('context view for date_nanos', () => {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'kibana_date_nanos']);
      await esArchiver.loadIfNeeded('date_nanos');
      await kibanaServer.uiSettings.replace({ defaultIndex: TEST_INDEX_PATTERN });
      await kibanaServer.uiSettings.update({
        'context:defaultSize': `${TEST_DEFAULT_CONTEXT_SIZE}`,
        'context:step': `${TEST_STEP_SIZE}`,
      });
    });

    after(async function unloadMakelogs() {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('date_nanos');
    });

    it('displays predessors - anchor - successors in right order ', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, 'AU_x3-TaGFA8no6Qj999Z');
      const actualRowsText = await docTable.getRowsText();
      const expectedRowsText = [
        'Sep 18, 2019 @ 06:50:13.000000000-2',
        'Sep 18, 2019 @ 06:50:12.999999999-3',
        'Sep 19, 2015 @ 06:50:13.0001000011',
      ];
      expect(actualRowsText).to.eql(expectedRowsText);
    });

    it('displays correctly when predecessors and successors are loaded', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, 'AU_x3-TaGFA8no6Qjisd');
      await PageObjects.context.clickPredecessorLoadMoreButton();
      await PageObjects.context.clickSuccessorLoadMoreButton();
      const actualRowsText = await docTable.getRowsText();
      const expectedRowsText = [
        'Sep 22, 2019 @ 23:50:13.2531233455',
        'Sep 18, 2019 @ 06:50:13.0000001044',
        'Sep 18, 2019 @ 06:50:13.0000001032',
        'Sep 18, 2019 @ 06:50:13.0000001021',
        'Sep 18, 2019 @ 06:50:13.0000001010',
        'Sep 18, 2019 @ 06:50:13.000000001-1',
        'Sep 18, 2019 @ 06:50:13.000000000-2',
        'Sep 18, 2019 @ 06:50:12.999999999-3',
        'Sep 19, 2015 @ 06:50:13.0001000011',
      ];
      expect(actualRowsText).to.eql(expectedRowsText);
    });
  });
}
