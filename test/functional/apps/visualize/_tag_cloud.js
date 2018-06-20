/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
          return PageObjects.visualize.selectOrderBy('_key');
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

      it('should have inspector enabled', async function () {
        const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
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


      it.skip('should still show all tags after sidebar has been collapsed', async function () {
        await PageObjects.visualize.clickEditorSidebarCollapse();
        // Give d3 tag cloud some time to rearrange tags
        await PageObjects.common.sleep(1000);
        await PageObjects.visualize.clickEditorSidebarCollapse();
        // Give d3 tag cloud some time to rearrange tags
        await PageObjects.common.sleep(1000);
        const data = await PageObjects.visualize.getTextTag();
        log.debug(data);
        expect(data).to.eql(['32,212,254,720', '21,474,836,480', '20,401,094,656', '19,327,352,832', '18,253,611,008']);
      });

      it.skip('should still show all tags after browser was resized very small', async function () {
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


      it.skip('should show the tags and relative size', function () {
        return PageObjects.visualize.getTextSizes()
          .then(function (results) {
            log.debug('results here ' + results);
            expect(results).to.eql(['72px', '63px', '25px', '32px',  '18px' ]);
          });
      });


      it.skip('should show correct data', function () {
        const expectedTableData =  [
          ['32,212,254,720', '737'],
          ['21,474,836,480', '728'],
          ['20,401,094,656', '687'],
          ['19,327,352,832', '695'],
          ['18,253,611,008', '679'],
        ];

        return PageObjects.visualize.openInspector()
          .then(function () {
            return PageObjects.visualize.setInspectorTablePageSize(50);
          })
          .then(function getInspectorTableData() {
            return PageObjects.visualize.getInspectorTableData();
          })
          .then(function showData(data) {
            log.debug(data);
            expect(data).to.eql(expectedTableData);
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
