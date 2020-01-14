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

import { load } from 'cheerio';

import expect from '@kbn/expect';

import { PluginFunctionalProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('rendering service', () => {
    it('renders "core" application', async () => {
      const response = await supertest.get('/render/core').expect(200);
      const dom = load(response.text);
      const metadata = JSON.parse(dom('kbn-injected-metadata').attr('data'));

      expect(metadata.legacyMode).to.be(false);
      expect(dom('script[src="/bundles/app/core/bootstrap.js"]').length).to.be(1);
      expect(metadata.legacyMetadata.uiSettings.user).not.to.be.empty();
    });

    it('renders "core" application without user settings', async () => {
      const response = await supertest.get('/render/core?includeUserSettings=false').expect(200);
      const dom = load(response.text);
      const metadata = JSON.parse(dom('kbn-injected-metadata').attr('data'));

      expect(metadata.legacyMode).to.be(false);
      expect(metadata.legacyMetadata.uiSettings.user).to.be.empty();
    });

    it('renders "legacy" application', async () => {
      const response = await supertest.get('/render/legacy').expect(200);
      const dom = load(response.text);
      const metadata = JSON.parse(dom('kbn-injected-metadata').attr('data'));

      expect(metadata.legacyMode).to.be(true);
      expect(dom('script[src="/bundles/app/legacy/bootstrap.js"]').length).to.be(1);
    });

    it('renders "legacy" application wihtout user settings', async () => {
      const response = await supertest.get('/render/legacy?includeUserSettings=false').expect(200);
      const dom = load(response.text);
      const metadata = JSON.parse(dom('kbn-injected-metadata').attr('data'));

      expect(metadata.legacyMode).to.be(true);
      expect(metadata.legacyMetadata.uiSettings.user).to.be.empty();
    });
  });
}
