import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const filterBar = getService('filterBar');
  const log = getService('log');
  const remote = getService('remote');
  const retry = getService('retry');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('visualize app', function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    const termsField = 'machine.ram';

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
            return PageObjects.visualize.selectField(termsField);
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

    describe('tag cloud chart', function () {
      const vizName1 = 'Visualization tagCloud';

      it('should display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it.skip('should show correct tag cloud data', async function () {
        const data = await PageObjects.visualize.getTextTag();
        log.debug(data);
        expect(data).to.eql([ '32,212,254,720', '21,474,836,480', '20,401,094,656', '19,327,352,832', '18,253,611,008' ]);
      });

      it('should collapse the sidebar', async function () {
        const editorSidebar = await find.byCssSelector('.collapsible-sidebar');
        await PageObjects.visualize.clickEditorSidebarCollapse();
        // Give d3 tag cloud some time to rearrange tags
        await PageObjects.common.sleep(1000);
        const afterSize = await editorSidebar.getSize();
        expect(afterSize.width).to.be(0);
        await PageObjects.visualize.clickEditorSidebarCollapse();
      });

      it('should still show all tags after sidebar has been collapsed', async function () {
        await PageObjects.visualize.clickEditorSidebarCollapse();
        // Give d3 tag cloud some time to rearrange tags
        await PageObjects.common.sleep(1000);
        await PageObjects.visualize.clickEditorSidebarCollapse();
        // Give d3 tag cloud some time to rearrange tags
        await PageObjects.common.sleep(1000);
        const data = await PageObjects.visualize.getTextTag();
        log.debug(data);
        expect(data).to.eql([ '32,212,254,720', '21,474,836,480', '20,401,094,656', '19,327,352,832', '18,253,611,008' ]);
      });

      it('should still show all tags after browser was resized very small', async function () {
        await remote.setWindowSize(200, 200);
        await PageObjects.common.sleep(1000);
        await remote.setWindowSize(1200, 800);
        await PageObjects.common.sleep(1000);
        const data = await PageObjects.visualize.getTextTag();
        expect(data).to.eql([ '32,212,254,720', '21,474,836,480', '20,401,094,656', '19,327,352,832', '18,253,611,008' ]);
      });

      it('should save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
          .then(() => {
            return PageObjects.common.getBreadcrumbPageTitle();
          })
          .then(pageTitle => {
            log.debug(`Save viz page title is ${pageTitle}`);
            expect(pageTitle).to.contain(vizName1);
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.header.waitForToastMessageGone();
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

        return PageObjects.visualize.toggleSpyPanel()
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

      describe('formatted field', function () {
        before(async function () {
          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickKibanaIndices();
          await PageObjects.settings.filterField(termsField);
          await PageObjects.settings.openControlsByName(termsField);
          await PageObjects.settings.setFieldFormat('Bytes');
          await PageObjects.settings.controlChangeSave();
          await PageObjects.common.navigateToUrl('visualize', 'new');
          await PageObjects.visualize.loadSavedVisualization(vizName1);
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.header.setAbsoluteRange(fromTime, toTime);
          await PageObjects.visualize.waitForVisualization();
        });

        after(async function () {
          await filterBar.removeFilter(termsField);
          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickKibanaIndices();
          await PageObjects.settings.filterField(termsField);
          await PageObjects.settings.openControlsByName(termsField);
          await PageObjects.settings.setFieldFormat('- default - ');
          await PageObjects.settings.controlChangeSave();
        });

        it('should format tags with field formatter', async function () {
          const data = await PageObjects.visualize.getTextTag();
          log.debug(data);
          expect(data).to.eql([ '30GB', '20GB', '19GB', '18GB', '17GB' ]);
        });

        it('should apply filter with unformatted value', async function () {
          await PageObjects.visualize.selectTagCloudTag('30GB');
          await PageObjects.common.sleep(500);
          const data = await PageObjects.visualize.getTextTag();
          expect(data).to.eql([ '30GB' ]);
        });

      });
    });

  });
}
