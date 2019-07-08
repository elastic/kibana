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

export function VisualizeListingTableProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'discover']);

  class VisualizeListingTable {
    async getAllVisualizationNamesOnCurrentPage() {
      const visualizationNames = [];
      const links = await find.allByCssSelector('.kuiLink');
      for (let i = 0; i < links.length; i++) {
        visualizationNames.push(await links[i].getVisibleText());
      }
      log.debug(`Found ${visualizationNames.length} visualizations on current page`);
      return visualizationNames;
    }

    async getAllVisualizationNames() {
      log.debug('VisualizeListingTable.getAllVisualizationNames');
      let morePages = true;
      let visualizationNames = [];
      while (morePages) {
        visualizationNames = visualizationNames.concat(await this.getAllVisualizationNamesOnCurrentPage());
        morePages = !(await testSubjects.getAttribute('pagerNextButton', 'disabled') === 'true');
        if (morePages) {
          await testSubjects.click('pagerNextButton');
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
      }
      return visualizationNames;
    }
  }

  return new VisualizeListingTable();
}
