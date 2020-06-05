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
import { Client, DeleteDocumentParams, GetParams, GetResponse } from 'elasticsearch';
import { TelemetrySavedObjectAttributes } from 'src/plugins/telemetry/server/telemetry_repository';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client: Client = getService('legacyEs');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/userHasSeenNotice API Telemetry User has seen OptIn Notice', () => {
    it('should update telemetry setting field via PUT', async () => {
      try {
        await client.delete({
          index: '.kibana',
          id: 'telemetry:telemetry',
        } as DeleteDocumentParams);
      } catch (err) {
        if (err.statusCode !== 404) {
          throw err;
        }
      }

      await supertest.put('/api/telemetry/v2/userHasSeenNotice').set('kbn-xsrf', 'xxx').expect(200);

      const {
        _source: { telemetry },
      }: GetResponse<{
        telemetry: TelemetrySavedObjectAttributes;
      }> = await client.get({
        index: '.kibana',
        id: 'telemetry:telemetry',
      } as GetParams);

      expect(telemetry.userHasSeenNotice).to.be(true);
    });
  });
}
