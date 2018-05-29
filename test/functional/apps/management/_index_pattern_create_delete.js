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
  const kibanaServer = getService('kibanaServer');
  const remote = getService('remote');
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('creating and deleting default index', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
        .then(function () {
          return PageObjects.settings.navigateTo();
        })
        .then(function () {
          return PageObjects.settings.clickKibanaIndices();
        });
    });

    describe('index pattern creation', function indexPatternCreation() {
      let indexPatternId;

      before(function () {
        return PageObjects.settings.createIndexPattern()
          .then(id => indexPatternId = id);
      });

      it('should have index pattern in page header', async function () {
        const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
        const patternName = await indexPageHeading.getVisibleText();
        expect(patternName).to.be('logstash-*');
      });

      it('should have index pattern in url', function url() {
        return retry.try(function tryingForTime() {
          return remote.getCurrentUrl()
            .then(function (currentUrl) {
              expect(currentUrl).to.contain(indexPatternId);
            });
        });
      });

      it('should have expected table headers', function checkingHeader() {
        return PageObjects.settings.getTableHeader()
          .then(function (headers) {
            log.debug('header.length = ' + headers.length);
            const expectedHeaders = [
              'Name',
              'Type',
              'Format',
              'Searchable',
              'Aggregatable',
              'Excluded',
              ''
            ];

            expect(headers.length).to.be(expectedHeaders.length);

            const comparedHeaders = headers.map(function compareHead(header, i) {
              return header.getVisibleText()
                .then(function (text) {
                  expect(text).to.be(expectedHeaders[i]);
                });
            });

            return Promise.all(comparedHeaders);
          });
      });
    });

    describe('index pattern deletion', function indexDelete() {
      before(function () {
        const expectedAlertText = 'Delete index pattern?';
        return PageObjects.settings.removeIndexPattern()
          .then(function (alertText) {
            expect(alertText).to.be(expectedAlertText);
          });
      });

      it('should return to index pattern creation page', function returnToPage() {
        return retry.try(function tryingForTime() {
          return PageObjects.settings.getCreateIndexPatternGoToStep2Button();
        });
      });

      it('should remove index pattern from url', function indexNotInUrl() {
        // give the url time to settle
        return retry.try(function tryingForTime() {
          return remote.getCurrentUrl()
            .then(function (currentUrl) {
              log.debug('currentUrl = ' + currentUrl);
              expect(currentUrl).to.not.contain('logstash-*');
            });
        });
      });
    });
  });
}
