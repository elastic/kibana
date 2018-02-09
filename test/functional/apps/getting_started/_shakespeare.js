import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  // const kibanaServer = getService('kibanaServer');
  // const remote = getService('remote');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['console', 'common', 'settings', 'visualize']);

  // https://www.elastic.co/guide/en/kibana/current/tutorial-load-dataset.html

  describe('Shakespeare', function describeIndexTests() {
    before(async function () {
      log.debug('Load empty_kibana and Shakespeare Getting Started data\n'
      + 'https://www.elastic.co/guide/en/kibana/current/tutorial-load-dataset.html');
      await esArchiver.load('empty_kibana');
      log.debug('Load shakespeare data');
      // await esArchiver.loadIfNeeded('getting_started/shakespeare');
    });

    it('should create shakespeare index pattern', async function () {
      log.debug('Create shakespeare index pattern');
      await PageObjects.settings.navigateTo();
      // await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern('shakespeare', null);
      const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
      const patternName = await indexPageHeading.getVisibleText();
      expect(patternName).to.be('shakespeare');
    });

    // https://www.elastic.co/guide/en/kibana/current/tutorial-visualizing.html
    /* 1. Click New and select Vertical bar chart.
    2. Select the shakes* index pattern. Since you haven’t defined any buckets
    yet, you’ll see a single big bar that shows the total count of documents that
    match the default wildcard query.
    */
    it('should create initial vertical bar chart', async function () {
      log.debug('create shakespeare vertical bar chart');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch('shakespeare');
      await PageObjects.visualize.waitForVisualization();

      const expectedChartValues = [111396];
      await retry.try(async () => {
        const data = await PageObjects.visualize.getBarChartData('Count');
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });
    });

    /* 3. To show the number of speaking parts per play along the y-axis, you need
    to configure the Y-axis metric aggregation. A metric aggregation computes
    metrics based on values extracted from the search results. To get the
    number of speaking parts per play, select the Unique Count aggregation
    and choose speaker from the field list. You can also give the axis a
    custom label, Speaking Parts.
    */
    it('should configure metric Unique Count Speaking Parts', async function () {
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.selectYAxisAggregation('Unique Count', 'speaker', 'Speaking Parts');
      await PageObjects.visualize.clickGo();
      await PageObjects.visualize.waitForVisualization();
      const expectedChartValues = [935];
      await retry.try(async () => {
        const data = await PageObjects.visualize.getBarChartData('Speaking Parts');
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });
      const title = await PageObjects.visualize.getYAxisTitle();
      expect(title).to.be('Speaking Parts');
    });

    /* 4. To show the different plays long the x-axis, select the X-Axis buckets
    type, select Terms from the aggregation list, and choose play_name from the
    field list. To list them alphabetically, select Ascending order. You can
    also give the axis a custom label, Play Name.
    5. Click Apply changes images/apply-changes-button.png to view the results.
    */
    it('should configure Terms aggregation on play_name', async function () {
      await PageObjects.visualize.clickBucket('X-Axis');
      log.debug('Aggregation = Terms');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Field = play_name');
      await PageObjects.visualize.selectField('play_name');
      await PageObjects.visualize.clickGo();

      const expectedChartValues = [ 71, 65, 62, 55, 55 ];
      await retry.try(async () => {
        const data = await PageObjects.visualize.getBarChartData('Speaking Parts');
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });

      const labels = await PageObjects.visualize.getXAxisLabels();
      expect(labels).to.eql([ 'Richard III', 'Henry VI Part 2', 'Coriolanus',
        'Antony and Cleopatra', 'Timon of Athens' ]);
    });

  });
}
