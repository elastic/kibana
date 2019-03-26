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
import { get } from 'lodash';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('user_action API', () => {
    it('increments the count field in the document defined by the {app}/{action_type} path', async () => {
      await supertest
        .post('/api/user_action/myApp/myAction')
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      return es.search({
        index: '.kibana',
        q: 'type:user-action',
      }).then(response => {
        const doc = get(response, 'hits.hits[0]');
        expect(get(doc, '_source.user-action.count')).to.be(1);
        expect(doc._id).to.be('user-action:myApp:myAction');
      });
    });
  });
}

