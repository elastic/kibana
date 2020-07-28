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

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');

  describe('legacy plugins', () => {
    describe('http', () => {
      it('has access to New Platform HTTP service', async () => {
        await supertest
          .get('/api/np-http-in-legacy')
          .expect(200)
          .expect('Pong in legacy via new platform: true');
      });

      it('has access to New Platform HTTP context providers', async () => {
        await supertest
          .get('/api/np-context-in-legacy')
          .expect(200)
          .expect(JSON.stringify({ contexts: ['core', 'pluginA'] }));
      });
    });

    describe('application service compatibility layer', () => {
      it('can render legacy apps', async () => {
        await PageObjects.common.navigateToApp('core_legacy_compat');
        expect(await testSubjects.exists('coreLegacyCompatH1')).to.be(true);
      });
    });
  });
}
