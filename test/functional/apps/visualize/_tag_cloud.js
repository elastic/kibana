import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(function () {

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
         .then(function () {
           log.debug('clickTagCloud');
           return PageObjects.visualize.clickTagCloud();
         })
        .then(function () {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function () {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          log.debug('select Tags');
          return PageObjects.visualize.clickBucket('Tags');
        })
        .then(function () {
          log.debug('Click aggregation Terms');
          return PageObjects.visualize.selectAggregation('Terms');
        })
        .then(function () {
          log.debug('Click field machine.ram');
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.selectField('machine.ram');
          });
        })
        .then(function () {
          return PageObjects.visualize.selectOrderBy('_term');
        })
        .then(function () {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });


    describe('tile cloud chart', function indexPatternCreation() {
      const vizName1 = 'Visualization tagCloud';

      it('should show correct tag cloud data', function () {
        return PageObjects.common.sleep(2000)
          .then(function () {
            return PageObjects.visualize.getTextTag().then(function (results) {
              log.debug(results);
              expect(results).to.eql([ '32212254720', '21474836480','20401094656','19327352832','18253611008' ]);
            });
          });
      });


      it('should save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
        .then(function (message) {
          log.debug('Saved viz message = ' + message);
          expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
        })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.visualize.waitForToastMessageGone();
          })
          .then(function () {
            return PageObjects.visualize.loadSavedVisualization(vizName1);
          })
          .then(function () {
            return PageObjects.header.waitUntilLoadingHasFinished();
          })
          .then(function waitForVisualization() {
            return PageObjects.visualize.waitForVisualization();
          });
      });


      it('should show the tags and relative size', function () {
        return PageObjects.visualize.getTextSizes()
        .then(function (results) {
          log.debug('results here ' + results);
          expect(results).to.eql(['72px', '63px', '25px', '32px',  '18px' ]);
        });
      });


      it('should show correct data', function () {
        const expectedTableData =  [ '32,212,254,720', '737',
          '21,474,836,480', '728',
          '20,401,094,656', '687',
          '19,327,352,832', '695',
          '18,253,611,008', '679'
        ];

        return PageObjects.visualize.collapseChart()
          .then(function () {
            return PageObjects.settings.setPageSize('All');
          })
          .then(function getDataTableData() {
            return PageObjects.visualize.getDataTableData();
          })
          .then(function showData(data) {
            log.debug(data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedTableData);
          });
      });
    });

  });
}
