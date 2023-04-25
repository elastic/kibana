/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import expect from '@kbn/expect';
import type { Response } from 'supertest';
import { SavedObject } from '@kbn/core/types';
import type { PluginFunctionalProviderContext } from '../../services';

function parseNdJson(input: string): Array<SavedObject<any>> {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const kbnServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('types with `hiddenFromHttpApis` ', () => {
    before(async () => {
      // `kbnServer.savedObjects.cleanStandardList` uses global saved objects `delete`.
      // If there are any remaining saved objects registered as `hiddenFromHttpApis:true`,
      // cleaning them up will fail.
      await kbnServer.savedObjects.cleanStandardList();

      await kbnServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/saved_objects_management/hidden_from_http_apis.json'
      );
    });

    after(async () => {
      // We cannot use `kbnServer.importExport.unload` to clean up test fixtures.
      // `kbnServer.importExport.unload` uses the global SOM `delete` HTTP API
      // and will throw on `hiddenFromHttpApis:true` objects
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_from_http_apis'
      );
    });

    describe('APIS', () => {
      const hiddenFromHttpApisType = {
        type: 'test-hidden-from-http-apis-importable-exportable',
        id: 'hidden-from-http-apis-1',
      };
      const notHiddenFromHttpApisType = {
        type: 'test-not-hidden-from-http-apis-importable-exportable',
        id: 'not-hidden-from-http-apis-1',
      };

      describe('_bulk_get', () => {
        describe('saved objects with hiddenFromHttpApis type', () => {
          const URL = '/api/kibana/management/saved_objects/_bulk_get';

          it('should return 200 for types that are not hidden from the http apis', async () =>
            await supertest
              .post(URL)
              .send([notHiddenFromHttpApisType])
              .set('kbn-xsrf', 'true')
              .expect(200)
              .then((response: Response) => {
                expect(response.body).to.have.length(1);
                const { type, id, meta, error } = response.body[0];
                expect(type).to.eql(notHiddenFromHttpApisType.type);
                expect(id).to.eql(notHiddenFromHttpApisType.id);
                expect(meta).to.not.equal(undefined);
                expect(error).to.equal(undefined);
              }));

          it('should return 200 for types that are hidden from the http apis', async () =>
            await supertest
              .post(URL)
              .send([hiddenFromHttpApisType])
              .set('kbn-xsrf', 'true')
              .expect(200)
              .then((response: Response) => {
                expect(response.body).to.have.length(1);
                const { type, id, meta, error } = response.body[0];
                expect(type).to.eql(hiddenFromHttpApisType.type);
                expect(id).to.eql(hiddenFromHttpApisType.id);
                expect(meta).to.not.equal(undefined);
                expect(error).to.equal(undefined);
              }));

          it('should return 200 for a mix of types', async () =>
            await supertest
              .post(URL)
              .send([hiddenFromHttpApisType, notHiddenFromHttpApisType])
              .set('kbn-xsrf', 'true')
              .expect(200)
              .expect(200)
              .then((response: Response) => {
                expect(response.body).to.have.length(2);
                const { type, id, meta, error } = response.body[0];
                expect(type).to.eql(hiddenFromHttpApisType.type);
                expect(id).to.eql(hiddenFromHttpApisType.id);
                expect(meta).to.not.equal(undefined);
                expect(error).to.equal(undefined);
              }));
        });
      });

      describe('find', () => {
        it('returns saved objects registered as hidden from the http Apis', async () => {
          await supertest
            .get(`/api/kibana/management/saved_objects/_find?type=${hiddenFromHttpApisType.type}`)
            .set('kbn-xsrf', 'true')
            .expect(200)
            .then((resp) => {
              expect(
                resp.body.saved_objects.map((so: { id: string; type: string }) => ({
                  id: so.id,
                  type: so.type,
                }))
              ).to.eql([
                {
                  id: 'hidden-from-http-apis-1',
                  type: 'test-hidden-from-http-apis-importable-exportable',
                },
                {
                  id: 'hidden-from-http-apis-2',
                  type: 'test-hidden-from-http-apis-importable-exportable',
                },
              ]);
            });
        });
      });

      describe('export', () => {
        it('allows to export them directly by id', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .set('kbn-xsrf', 'true')
            .send({
              objects: [
                {
                  type: 'test-hidden-from-http-apis-importable-exportable',
                  id: 'hidden-from-http-apis-1',
                },
              ],
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              const objects = parseNdJson(resp.text);
              expect(objects.map((obj) => obj.id)).to.eql(['hidden-from-http-apis-1']);
            });
        });

        it('allows to export them directly by type', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .set('kbn-xsrf', 'true')
            .send({
              type: ['test-hidden-from-http-apis-importable-exportable'],
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              const objects = parseNdJson(resp.text);
              expect(objects.map((obj) => obj.id)).to.eql([
                'hidden-from-http-apis-1',
                'hidden-from-http-apis-2',
              ]);
            });
        });
      });

      describe('import', () => {
        it('allows to import them', async () => {
          await supertest
            .post('/api/saved_objects/_import')
            .set('kbn-xsrf', 'true')
            .attach('file', join(__dirname, './exports/_import_hidden_from_http_apis.ndjson'))
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                success: true,
                successCount: 2,
                successResults: [
                  {
                    id: 'hidden-from-http-apis-import1',
                    meta: {
                      title: 'I am hidden from http apis but the client can still see me',
                    },
                    type: 'test-hidden-from-http-apis-importable-exportable',
                    managed: false,
                  },
                  {
                    id: 'not-hidden-from-http-apis-import1',
                    meta: {
                      title: 'I am not hidden from http apis',
                    },
                    type: 'test-not-hidden-from-http-apis-importable-exportable',
                    managed: false,
                  },
                ],
                warnings: [],
              });
            });
        });
      });
    });
  });
}
