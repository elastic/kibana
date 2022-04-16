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
import type { SavedObjectManagementTypeInfo } from '@kbn/saved-objects-management-plugin/common/types';
import type { PluginFunctionalProviderContext } from '../../services';

function parseNdJson(input: string): Array<SavedObject<any>> {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('types with `visibleInManagement` ', () => {
    before(async () => {
      await esArchiver.load(
        'test/functional/fixtures/es_archiver/saved_objects_management/visible_in_management'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/visible_in_management'
      );
    });

    describe('export', () => {
      it('allows to export them directly by id', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            objects: [
              {
                type: 'test-not-visible-in-management',
                id: 'vim-1',
              },
            ],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.map((obj) => obj.id)).to.eql(['vim-1']);
          });
      });

      it('allows to export them directly by type', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set('kbn-xsrf', 'true')
          .send({
            type: ['test-not-visible-in-management'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.map((obj) => obj.id)).to.eql(['vim-1']);
          });
      });
    });

    describe('import', () => {
      it('allows to import them', async () => {
        await supertest
          .post('/api/saved_objects/_import')
          .set('kbn-xsrf', 'true')
          .attach('file', join(__dirname, './exports/_import_non_visible_in_management.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 1,
              successResults: [
                {
                  id: 'ff3773b0-9ate-11e7-ahb3-3dcb94193fab',
                  meta: {
                    title: 'Saved object type that is not visible in management',
                  },
                  type: 'test-not-visible-in-management',
                },
              ],
              warnings: [],
            });
          });
      });
    });

    describe('savedObjects management APIS', () => {
      describe('GET /api/kibana/management/saved_objects/_allowed_types', () => {
        let types: SavedObjectManagementTypeInfo[];

        before(async () => {
          await supertest
            .get('/api/kibana/management/saved_objects/_allowed_types')
            .set('kbn-xsrf', 'true')
            .expect(200)
            .then((response: Response) => {
              types = response.body.types as SavedObjectManagementTypeInfo[];
            });
        });

        it('should only return types that are `visibleInManagement: true`', () => {
          const typeNames = types.map((type) => type.name);

          expect(typeNames.includes('test-is-exportable')).to.eql(true);
          expect(typeNames.includes('test-visible-in-management')).to.eql(true);
          expect(typeNames.includes('test-not-visible-in-management')).to.eql(false);
        });

        it('should return displayName for types specifying it', () => {
          const typeWithDisplayName = types.find((type) => type.name === 'test-with-display-name');
          expect(typeWithDisplayName !== undefined).to.eql(true);
          expect(typeWithDisplayName!.displayName).to.eql('my display name');

          const typeWithoutDisplayName = types.find(
            (type) => type.name === 'test-visible-in-management'
          );
          expect(typeWithoutDisplayName !== undefined).to.eql(true);
          expect(typeWithoutDisplayName!.displayName).to.eql('test-visible-in-management');
        });
      });
    });
  });
}
