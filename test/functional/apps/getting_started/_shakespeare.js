import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  // const kibanaServer = getService('kibanaServer');
  // const remote = getService('remote');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['console', 'common', 'settings']);

  // https://www.elastic.co/guide/en/kibana/current/tutorial-load-dataset.html

  describe('Shakespeare', function describeIndexTests() {
    before(async function () {
      log.debug('Load empty_kibana and Shakespeare Getting Started data\n'
      + 'https://www.elastic.co/guide/en/kibana/current/tutorial-load-dataset.html');
      await esArchiver.load('empty_kibana');
      log.debug('Load shakespeare data');
      await esArchiver.loadIfNeeded('getting_started/shakespeare');
    });

    it('should create shakespeare index pattern', async function () {
      log.debug('Create shakespeare index pattern');
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern('shakespeare', null);
      const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
      const patternName = await indexPageHeading.getVisibleText();
      expect(patternName).to.be('shakespeare');
    });


    it('should create shakespeare index pattern', async function () {
      log.debug('Create shakespeare index pattern');
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern('shakespeare', null);
      const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
      const patternName = await indexPageHeading.getVisibleText();
      expect(patternName).to.be('shakespeare');
    });


    it('should create initial vertical bar chart', async function () {
      log.debug('create shakespeare vertical bar chart');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();

      const expectedChartValues = [111396];
      await retry.try(async () => {
        const data = await PageObjects.visualize.getBarChartData();
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });
    });


    it('should configure metric Speaking Parts', async function () {
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.selectYAxisAggregation('Unique Count', 'speaker', 'Speaking Parts');
      await PageObjects.visualize.clickGo();
      await PageObjects.common.sleep(10000);
      //
      // await PageObjects.visualize.clickBucket('X-Axis');
      // log.debug('Aggregation = Date Histogram');
      // await PageObjects.visualize.selectAggregation('Date Histogram');
      // log.debug('Field = @timestamp');
      // await PageObjects.visualize.selectField('@timestamp');
      // await PageObjects.visualize.clickGo();

    });

    //         expect(headers.length).to.be(expectedHeaders.length);
    //
    //         const comparedHeaders = headers.map(function compareHead(header, i) {
    //           return header.getVisibleText()
    //             .then(function (text) {
    //               expect(text).to.be(expectedHeaders[i]);
    //             });
    //         });
    //
    //         return Promise.all(comparedHeaders);
    //       });
    //   });
    // });
    //
    // describe('index pattern deletion', function indexDelete() {
    //   before(function () {
    //     const expectedAlertText = 'Delete index pattern?';
    //     return PageObjects.settings.removeIndexPattern()
    //       .then(function (alertText) {
    //         expect(alertText).to.be(expectedAlertText);
    //       });
    //   });
    //
    //   it('should return to index pattern creation page', function returnToPage() {
    //     return retry.try(function tryingForTime() {
    //       return PageObjects.settings.getCreateIndexPatternGoToStep2Button();
    //     });
    //   });
    //
    //   it('should remove index pattern from url', function indexNotInUrl() {
    //     // give the url time to settle
    //     return retry.try(function tryingForTime() {
    //       return remote.getCurrentUrl()
    //         .then(function (currentUrl) {
    //           log.debug('currentUrl = ' + currentUrl);
    //           expect(currentUrl).to.not.contain('logstash-*');
    //         });
    //     });
    //   });
    // });
  });
}
