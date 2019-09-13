import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('check winlogbeat', function () {

  bdd.it('winlogbeat- should have ServiceControlManager label in PieChart', async function () {
    return PageObjects.common.navigateToApp('visualize');
			//await PageObjects.visualize.filterVisByName('Sources');
    await PageObjects.visualize.openSavedVisualization('Sources');
    await PageObjects.common.sleep(1000);
    await PageObjects.header.setQuickSpan('Last 7 days');
    await PageObjects.common.sleep(1000);
    await PageObjects.common.tryForTime(40000, async () => {
      const pieChart = await PageObjects.visualize.getLegendLabelsList();
      PageObjects.common.debug('Pie Chart labels = ' + pieChart);
				// we should always have Service Control Manager events in the windows event viewer on our test machine.
      expect(pieChart).to.contain('Service Control Manager');
    });
  });

});
