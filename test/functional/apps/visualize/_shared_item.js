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
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('visualize app', function describeIndexTests() {

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToApp('visualize');
    });

    describe('data-shared-item', function indexPatternCreation() {

      it('should have the correct data-shared-item title and description', function () {
        const expected = {
          title: 'Shared-Item Visualization AreaChart',
          description: 'AreaChart'
        };

        return PageObjects.visualize.clickVisualizationByName('Shared-Item Visualization AreaChart')
          .then(() => retry.try(function () {
            return PageObjects.common.getSharedItemTitleAndDescription()
              .then(({ title, description }) => {
                expect(title).to.eql(expected.title);
                expect(description).to.eql(expected.description);
              });
          }));
      });
    });
  });
}
