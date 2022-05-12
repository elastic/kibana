/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

const fixturePaths = {
  hiddenImportable: path.join(__dirname, 'exports', '_import_hidden_importable.ndjson'),
  hiddenNonImportable: path.join(__dirname, 'exports', '_import_hidden_non_importable.ndjson'),
};

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  // Failing: See https://github.com/elastic/kibana/issues/116059
  describe.skip('saved objects management with hidden types', () => {
    before(async () => {
      await esArchiver.load(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_types'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_types'
      );
    });

    beforeEach(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    describe('API calls', () => {
      it('should flag the object as hidden in its meta', async () => {
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=test-actions-export-hidden')
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((resp) => {
            expect(
              resp.body.saved_objects.map((obj: any) => ({
                id: obj.id,
                type: obj.type,
                hidden: obj.meta.hiddenType,
              }))
            ).to.eql([
              {
                id: 'obj_1',
                type: 'test-actions-export-hidden',
                hidden: true,
              },
              {
                id: 'obj_2',
                type: 'test-actions-export-hidden',
                hidden: true,
              },
            ]);
          });
      });
    });

    describe('Delete modal', () => {
      it('should display a warning then trying to delete hidden saved objects', async () => {
        await PageObjects.savedObjects.clickCheckboxByTitle('A Pie');
        await PageObjects.savedObjects.clickCheckboxByTitle('A Dashboard');
        await PageObjects.savedObjects.clickCheckboxByTitle('hidden object 1');

        await PageObjects.savedObjects.clickDelete({ confirmDelete: false });
        expect(await testSubjects.exists('cannotDeleteObjectsConfirmWarning')).to.eql(true);
      });

      it('should not delete the hidden objects when performing the operation', async () => {
        await PageObjects.savedObjects.clickCheckboxByTitle('A Pie');
        await PageObjects.savedObjects.clickCheckboxByTitle('hidden object 1');

        await PageObjects.savedObjects.clickDelete({ confirmDelete: true });

        const objectNames = (await PageObjects.savedObjects.getTableSummary()).map(
          (obj) => obj.title
        );
        expect(objectNames.includes('hidden object 1')).to.eql(true);
        expect(objectNames.includes('A Pie')).to.eql(false);
      });
    });

    describe('importing hidden types', () => {
      describe('importable/exportable hidden type', () => {
        it('imports objects successfully', async () => {
          await PageObjects.savedObjects.importFile(fixturePaths.hiddenImportable);
          await PageObjects.savedObjects.checkImportSucceeded();
        });

        it('shows test-hidden-importable-exportable in table', async () => {
          await PageObjects.savedObjects.searchForObject(
            'type:(test-hidden-importable-exportable)'
          );
          const results = await PageObjects.savedObjects.getTableSummary();
          expect(results.length).to.be(1);

          const { title } = results[0];
          expect(title).to.be(
            'test-hidden-importable-exportable [id=ff3733a0-9fty-11e7-ahb3-3dcb94193fab]'
          );
        });
      });

      describe('non-importable/exportable hidden type', () => {
        it('fails to import object', async () => {
          await PageObjects.savedObjects.importFile(fixturePaths.hiddenNonImportable);
          await PageObjects.savedObjects.checkImportSucceeded();

          const errorsCount = await PageObjects.savedObjects.getImportErrorsCount();
          expect(errorsCount).to.be(1);
        });
      });
    });
  });
}
