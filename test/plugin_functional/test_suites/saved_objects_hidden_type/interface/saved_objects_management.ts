/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../../services';

export default function ({ getPageObjects, getService }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);
  const esArchiver = getService('esArchiver');
  const fixturePaths = {
    hiddenImportable: path.join(__dirname, 'exports', '_import_hidden_importable.ndjson'),
    hiddenNonImportable: path.join(__dirname, 'exports', '_import_hidden_non_importable.ndjson'),
  };

  describe('Saved objects management Interface', () => {
    before(() => esArchiver.emptyKibanaIndex());
    beforeEach(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });
    describe('importable/exportable hidden type', () => {
      it('imports objects successfully', async () => {
        await PageObjects.savedObjects.importFile(fixturePaths.hiddenImportable);
        await PageObjects.savedObjects.checkImportSucceeded();
      });

      it('shows test-hidden-importable-exportable in table', async () => {
        await PageObjects.savedObjects.searchForObject('type:(test-hidden-importable-exportable)');
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
}
