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
import url from 'url';
import supertestAsPromised from 'supertest-as-promised';
import getUrl from '../../../../src/test_utils/get_url';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['dashboard', 'header']);
  const config = getService('config');
  const supertest = supertestAsPromised(url.format(config.get('servers.kibana')));
  const home = getUrl.baseUrl(config.get('servers.kibana'));

  describe('running tasks', () => {
    beforeEach(() => supertest.post('/api/migration_ui_plugin/reset')
      .set('kbn-xsrf', 'xxx')
      .send({ count: 0, isEnabled: true })
      .expect(200)
      .then(() => remote.get(home))
      .then(() => remote.refresh()));

    // The plugin goes 50% -> error -> 75% -> 100%, so we test that A) the progress
    // bar moves forward, and B) the loading screen goes away properly.
    it('should poll, updating progress, then refresh', async () => {
      await retry.try(async () => expect(await currentProgress()).to.match(/(50|75)%/));
      await retry.try(() => PageObjects.header.waitUntilLoadingHasFinished());
    });

    function currentProgress() {
      return remote.execute(function () {
        const el = document.querySelector('.upgradeProgressbar');
        return el && el.style && el.style.width;
      });
    }
  });
}
