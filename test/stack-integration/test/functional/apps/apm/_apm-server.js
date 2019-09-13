import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('check apm-server', function () {
  bdd.before(function () {
    PageObjects.common.debug('navigateToApp Visualize');
    return PageObjects.common.navigateToApp('visualize');
  });

  bdd.it('Top Transactions for Time Period [APM]- should have expected test data', async function () {
    await PageObjects.visualize.openSavedVisualization('Top Transactions for Time Period [APM]');
    await PageObjects.common.sleep(1000);
    await PageObjects.common.tryForTime(40000, async () => {
      await PageObjects.header.setQuickSpan('Last 2 years');
    });
    await PageObjects.common.sleep(1000);
    await PageObjects.common.tryForTime(4000, async () => {
      const dataTable = await PageObjects.visualize.getDataTableData();
      PageObjects.common.debug('Data Table = ' + dataTable.trim());
      // we loaded specific test data so we know exactly what this result should be

    });
    await PageObjects.header.setQuickSpan('Last 1 hour');
  });

});
