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
import sinon from 'sinon';

import {
  getServices,
  chance,
  assertSinonMatch,
} from './lib';

export function indexMissingSuite() {
  async function setup() {
    const { callCluster, kbnServer, deleteKibanaIndex } = getServices();
    const indexName = kbnServer.config.get('kibana.index');

    // ensure the kibana index does not exist
    await deleteKibanaIndex(callCluster);

    return {
      kbnServer,

      // an incorrect number of shards is how we determine when the index was not created by Kibana,
      // but automatically by writing to es when index didn't exist
      async assertValidKibanaIndex() {
        const resp = await callCluster('indices.get', {
          index: indexName
        });

        expect(resp[indexName].mappings).to.have.property('doc');
        expect(resp[indexName].mappings.doc.properties).to.have.keys(
          'index-pattern',
          'visualization',
          'search',
          'dashboard'
        );
      }
    };
  }

  describe('get route', () => {
    it('returns a 200 and creates doc, upgrades old value', async () => {
      const { kbnServer } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'GET',
        url: '/api/kibana/settings'
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number,
          },
          foo: {
            userValue: 'bar',
            isOverridden: true
          }
        }
      });
    });
  });

  describe('set route', () => {
    it('returns a 200 and creates a valid kibana index', async () => {
      const { kbnServer, assertValidKibanaIndex } = await setup();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: {
          value: defaultIndex
        }
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number
          },
          defaultIndex: {
            userValue: defaultIndex
          },
          foo: {
            userValue: 'bar',
            isOverridden: true
          }
        }
      });

      await assertValidKibanaIndex();
    });
  });

  describe('setMany route', () => {
    it('returns a 200 and creates a valid kibana index', async () => {
      const { kbnServer, assertValidKibanaIndex } = await setup();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: { defaultIndex }
        }
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number
          },
          defaultIndex: {
            userValue: defaultIndex
          },
          foo: {
            userValue: 'bar',
            isOverridden: true
          }
        }
      });

      await assertValidKibanaIndex();
    });
  });

  describe('delete route', () => {
    it('returns a 200 and creates a valid kibana index', async () => {
      const { kbnServer, assertValidKibanaIndex } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex'
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number
          },
          foo: {
            userValue: 'bar',
            isOverridden: true
          }
        }
      });

      await assertValidKibanaIndex();
    });
  });
}
