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

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('elasticsearch', () => {
    before(() => esArchiver.load('elasticsearch'));
    after(() => esArchiver.unload('elasticsearch'));

    it('allows search to specific index', async () =>
      await supertest.post('/elasticsearch/elasticsearch/_search').expect(200));

    it('allows msearch', async () =>
      await supertest
        .post('/elasticsearch/_msearch')
        .set('content-type', 'application/x-ndjson')
        .send(
          '{"index":"logstash-2015.04.21","ignore_unavailable":true}\n{"size":500,"sort":{"@timestamp":"desc"},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"bool":{"must":[{"range":{"@timestamp":{"gte":1429577068175,"lte":1429577968175}}}],"must_not":[]}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"30s","min_doc_count":0,"extended_bounds":{"min":1429577068175,"max":1429577968175}}}},"stored_fields":["*"],"_source": true,"script_fields":{},"docvalue_fields":["timestamp_offset","@timestamp","utc_time"]}\n'
        )
        .expect(200));
  });
}
