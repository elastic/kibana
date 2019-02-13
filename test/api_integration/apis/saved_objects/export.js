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

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  function parser(res, done) {
    res.setEncoding('binary');
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => done(null, new Buffer(data, 'binary').toString()));
  }

  describe('export', () => {
    before(() => esArchiver.load('saved_objects/basic'));
    after(() => esArchiver.unload('saved_objects/basic'));

    it('should return 400 exporting without type or objects passed in', async () => {
      await supertest
        .get('/api/saved_objects/_export')
        .expect(400)
        .buffer()
        .parse(parser)
        .then((resp) => {
          expect(JSON.parse(resp.body)).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: '"value" must contain at least one of [type, objects]',
            validation: {
              source: 'query',
              keys: ['value'],
            },
          });
        });
    });

    it('should return 200 exporting by type', async () => {
      await supertest
        .get('/api/saved_objects/_export')
        .query({
          type: ['dashboard'],
        })
        .expect(200)
        .buffer()
        .parse(parser)
        .then((resp) => {
          expect(resp.headers['content-disposition']).to.eql('attachment; filename="export.ndjson"');
          const stringifiedObjects = resp.body.split('\n');
          expect(stringifiedObjects.length).to.be(1);
          expect(JSON.parse(stringifiedObjects[0])).to.eql({
            attributes: {
              description: '',
              hits: 0,
              kibanaSavedObjectMeta: {
                // eslint-disable-next-line max-len
                searchSourceJSON: '{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[],\"highlightAll\":true,\"version\":true}',
              },
              optionsJSON: '{\"darkTheme\":false}',
              panelsJSON: '[{\"size_x\":6,\"size_y\":3,\"panelIndex\":1,\"col\":1,\"row\":1,\"panelRefName\":\"panel_0\"}]',
              refreshInterval: {
                display: 'Off',
                pause: false,
                value: 0,
              },
              timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
              timeRestore: true,
              timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
              title: 'Requests',
              uiStateJSON: '{}',
              version: 1,
            },
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            migrationVersion: {
              dashboard: '7.0.0',
            },
            references: [
              {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                name: 'panel_0',
                type: 'visualization',
              },
            ],
            type: 'dashboard',
            updated_at: '2017-09-21T18:57:40.826Z',
            version: 'WzMsMV0=',
          });
        });
    });

    it('should return 200 exporting by objects', async () => {
      await supertest
        .get('/api/saved_objects/_export')
        .query({
          objects: JSON.stringify([
            {
              type: 'dashboard',
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            },
          ]),
        })
        .expect(200)
        .buffer()
        .parse(parser)
        .then((resp) => {
          expect(resp.headers['content-disposition']).to.eql('attachment; filename="export.ndjson"');
          const stringifiedObjects = resp.body.split('\n');
          expect(stringifiedObjects.length).to.be(1);
          expect(JSON.parse(stringifiedObjects[0])).to.eql({
            attributes: {
              description: '',
              hits: 0,
              kibanaSavedObjectMeta: {
                // eslint-disable-next-line max-len
                searchSourceJSON: '{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[],\"highlightAll\":true,\"version\":true}',
              },
              optionsJSON: '{\"darkTheme\":false}',
              panelsJSON: '[{\"size_x\":6,\"size_y\":3,\"panelIndex\":1,\"col\":1,\"row\":1,\"panelRefName\":\"panel_0\"}]',
              refreshInterval: {
                display: 'Off',
                pause: false,
                value: 0,
              },
              timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
              timeRestore: true,
              timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
              title: 'Requests',
              uiStateJSON: '{}',
              version: 1,
            },
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            migrationVersion: {
              dashboard: '7.0.0',
            },
            references: [
              {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                name: 'panel_0',
                type: 'visualization',
              },
            ],
            type: 'dashboard',
            updated_at: '2017-09-21T18:57:40.826Z',
            version: 'WzMsMV0=',
          });
        });
    });
  });
}
