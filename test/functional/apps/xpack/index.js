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

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['monitoring', 'settings']);

  describe('dismiss x-pack', function () {
    // Putting everything here in 'before' so it doesn't count as a test
    // since x-pack may or may not be installed.  We just want the banner closed.
    before(function () {
      log.debug('check for X-Pack welcome, opt-out, and dismiss it');

      // find class kbnToaster and see if there's any list items in it?
      return PageObjects.settings
        .navigateTo()
        .then(() => {
          return PageObjects.monitoring.getToasterContents();
        })
        .then(contents => {
          // Welcome to X-Pack!
          // Sharing your cluster statistics with us helps us improve. Your data is never shared with anyone. Not interested? Opt out here.
          // Dismiss
          log.debug('Toast banner contents = ' + contents);
          if (contents.includes('X-Pack')) {
            return PageObjects.monitoring.clickOptOut().then(() => {
              return PageObjects.monitoring.dismissWelcome();
            });
          }
        });
    });
  });
}
