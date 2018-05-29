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
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'home']);

  describe('Kibana takes you home', function describeIndexTests() {

    it('clicking on kibana logo should take you to home page', async ()=> {
      await PageObjects.common.navigateToApp('settings');
      await PageObjects.home.clickKibanaIcon();
      const url = await remote.getCurrentUrl();
      expect(url.includes('/app/kibana#/home')).to.be(true);
    });

    it('clicking on console on homepage should take you to console app', async ()=> {
      await PageObjects.home.clickSynopsis('console');
      const url = await remote.getCurrentUrl();
      expect(url.includes('/app/kibana#/dev_tools/console?_g=()')).to.be(true);
    });

  });
}
