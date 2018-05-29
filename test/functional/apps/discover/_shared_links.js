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
  const retry = getService('retry');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header']);

  describe('shared links', function describeIndexTests() {
    let baseUrl;

    before(function () {
      baseUrl = PageObjects.common.getHostPort();
      log.debug('baseUrl = ' + baseUrl);
      // browsers don't show the ':port' if it's 80 or 443 so we have to
      // remove that part so we can get a match in the tests.
      baseUrl = baseUrl.replace(':80', '').replace(':443', '');
      log.debug('New baseUrl = ' + baseUrl);

      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      return kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      })
        .then(function loadkibanaIndexPattern() {
          log.debug('load kibana index with default index pattern');
          return esArchiver.load('discover');
        })
      // and load a set of makelogs data
        .then(function loadIfEmptyMakelogs() {
          return esArchiver.loadIfNeeded('logstash_functional');
        })
        .then(function () {
          log.debug('discover');
          return PageObjects.common.navigateToApp('discover');
        })
        .then(function () {
          log.debug('setAbsoluteRange');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
        //After hiding the time picker, we need to wait for
        //the refresh button to hide before clicking the share button
          return PageObjects.common.sleep(1000);
        });
    });


    describe('shared link', function () {
      it('should show "Share a link" caption', function () {
        const expectedCaption = 'Share saved';
        return PageObjects.discover.clickShare()
          .then(function () {
            return PageObjects.discover.getShareCaption();
          })
          .then(function (actualCaption) {
            expect(actualCaption).to.contain(expectedCaption);
          });
      });

      it('should show the correct formatted URL', function () {
        const expectedUrl = baseUrl
          + '/app/kibana?_t=1453775307251#'
          + '/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time'
          + ':(from:\'2015-09-19T06:31:44.000Z\',mode:absolute,to:\'2015-09'
          + '-23T18:31:44.000Z\'))&_a=(columns:!(_source),index:\'logstash-'
          + '*\',interval:auto,query:(language:lucene,query:\'\')'
          + ',sort:!(\'@timestamp\',desc))';
        return PageObjects.discover.getSharedUrl()
          .then(function (actualUrl) {
          // strip the timestamp out of each URL
            expect(actualUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP'))
              .to.be(expectedUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP'));
          });
      });

      it('gets copied to clipboard', async function () {
        const isCopiedToClipboard = await PageObjects.discover.clickCopyToClipboard();
        expect(isCopiedToClipboard).to.eql(true);
      });

      // TODO: verify clipboard contents
      it('shorten URL button should produce a short URL', function () {
        const re = new RegExp(baseUrl + '/goto/[0-9a-f]{32}$');
        return PageObjects.discover.clickShortenUrl()
          .then(function () {
            return retry.try(function tryingForTime() {
              return PageObjects.discover.getSharedUrl()
                .then(function (actualUrl) {
                  expect(actualUrl).to.match(re);
                });
            });
          });
      });

      // NOTE: This test has to run immediately after the test above
      it('copies short URL to clipboard', async function () {
        const isCopiedToClipboard = await PageObjects.discover.clickCopyToClipboard();
        expect(isCopiedToClipboard).to.eql(true);
      });
    });
  });
}
