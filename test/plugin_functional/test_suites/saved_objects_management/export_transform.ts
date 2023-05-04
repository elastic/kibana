/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { SavedObject } from '@kbn/core/types';
import type { SavedObjectsExportResultDetails } from '@kbn/core/server';
import { PluginFunctionalProviderContext } from '../../services';

function parseNdJson(input: string): Array<SavedObject<any>> {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('export transforms', () => {
    describe('root objects export transforms', () => {
      before(async () => {
        await esArchiver.load(
          'test/functional/fixtures/es_archiver/saved_objects_management/export_transform'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'test/functional/fixtures/es_archiver/saved_objects_management/export_transform'
        );
      });

      it('allows to mutate the objects during an export', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            type: ['test-export-transform'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.map((obj) => ({ id: obj.id, enabled: obj.attributes.enabled }))).to.eql([
              {
                id: 'type_1-obj_1',
                enabled: false,
              },
              {
                id: 'type_1-obj_2',
                enabled: false,
              },
            ]);
          });
      });

      it('allows to add additional objects to an export', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            objects: [
              {
                type: 'test-export-add',
                id: 'type_2-obj_1',
              },
            ],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.map((obj) => obj.id)).to.eql(['type_2-obj_1', 'type_dep-obj_1']);
          });
      });

      it('allows to add additional objects to an export when exporting by type', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            type: ['test-export-add'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.map((obj) => obj.id)).to.eql([
              'type_2-obj_1',
              'type_2-obj_2',
              'type_dep-obj_1',
              'type_dep-obj_2',
            ]);
          });
      });

      it('returns a 400 when the type causes a transform error', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            type: ['test-export-transform-error'],
            excludeExportDetails: true,
          })
          .expect(400)
          .then((resp) => {
            const { attributes, ...error } = resp.body;
            expect(error).to.eql({
              error: 'Bad Request',
              message: 'Error transforming objects to export',
              statusCode: 400,
            });
            expect(attributes.cause).to.eql('Error during transform');
            expect(attributes.objects.map((obj: any) => obj.id)).to.eql(['type_4-obj_1']);
          });
      });

      it('returns a 400 when the type causes an invalid transform', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            type: ['test-export-invalid-transform'],
            excludeExportDetails: true,
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              error: 'Bad Request',
              message: 'Invalid transform performed on objects to export',
              statusCode: 400,
              attributes: {
                objectKeys: ['test-export-invalid-transform|type_3-obj_1'],
              },
            });
          });
      });
    });

    describe('nested export transforms', () => {
      before(async () => {
        await esArchiver.load(
          'test/functional/fixtures/es_archiver/saved_objects_management/nested_export_transform'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'test/functional/fixtures/es_archiver/saved_objects_management/nested_export_transform'
        );
      });

      it('execute export transforms for reference objects', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            objects: [
              {
                type: 'test-export-transform',
                id: 'type_1-obj_1',
              },
            ],
            includeReferencesDeep: true,
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text).sort((obj1, obj2) =>
              obj1.id.localeCompare(obj2.id)
            );
            expect(objects.map((obj) => obj.id)).to.eql([
              'type_1-obj_1',
              'type_1-obj_2',
              'type_2-obj_1',
              'type_dep-obj_1',
            ]);

            expect(objects[0].attributes.enabled).to.eql(false);
            expect(objects[1].attributes.enabled).to.eql(false);
          });
      });
    });

    describe('isExportable API', () => {
      before(async () => {
        await esArchiver.load(
          'test/functional/fixtures/es_archiver/saved_objects_management/export_exclusion'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'test/functional/fixtures/es_archiver/saved_objects_management/export_exclusion'
        );
      });

      it('should only export objects returning `true` for `isExportable`', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            objects: [
              {
                type: 'test-is-exportable',
                id: '1',
              },
            ],
            includeReferencesDeep: true,
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text).sort((obj1, obj2) =>
              obj1.id.localeCompare(obj2.id)
            );
            expect(objects.map((obj) => `${obj.type}:${obj.id}`)).to.eql([
              'test-is-exportable:1',
              'test-is-exportable:3',
              'test-is-exportable:5',
            ]);
          });
      });

      it('lists objects that got filtered', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            objects: [
              {
                type: 'test-is-exportable',
                id: '1',
              },
            ],
            includeReferencesDeep: true,
            excludeExportDetails: false,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            const exportDetails = objects[
              objects.length - 1
            ] as unknown as SavedObjectsExportResultDetails;

            expect(exportDetails.excludedObjectsCount).to.eql(2);
            expect(exportDetails.excludedObjects).to.eql([
              {
                type: 'test-is-exportable',
                id: '2',
                reason: 'excluded',
              },
              {
                type: 'test-is-exportable',
                id: '4',
                reason: 'excluded',
              },
            ]);
          });
      });

      it('excludes objects if `isExportable` throws', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            objects: [
              {
                type: 'test-is-exportable',
                id: '5',
              },
              {
                type: 'test-is-exportable',
                id: 'error',
              },
            ],
            includeReferencesDeep: true,
            excludeExportDetails: false,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.length).to.eql(2);
            expect([objects[0]].map((obj) => `${obj.type}:${obj.id}`)).to.eql([
              'test-is-exportable:5',
            ]);
            const exportDetails = objects[
              objects.length - 1
            ] as unknown as SavedObjectsExportResultDetails;
            expect(exportDetails.excludedObjects).to.eql([
              {
                type: 'test-is-exportable',
                id: 'error',
                reason: 'predicate_error',
              },
            ]);
          });
      });
    });
  });
}
