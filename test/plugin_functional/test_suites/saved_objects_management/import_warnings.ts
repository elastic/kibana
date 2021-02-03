/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import path from 'path';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);

  describe('import warnings', () => {
    beforeEach(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    it('should display simple warnings', async () => {
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_import_type_1.ndjson')
      );

      await PageObjects.savedObjects.checkImportSucceeded();
      const warnings = await PageObjects.savedObjects.getImportWarnings();

      expect(warnings).to.eql([
        {
          message: 'warning for test_import_warning_1',
          type: 'simple',
        },
      ]);
    });

    it('should display action warnings', async () => {
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_import_type_2.ndjson')
      );

      await PageObjects.savedObjects.checkImportSucceeded();
      const warnings = await PageObjects.savedObjects.getImportWarnings();

      expect(warnings).to.eql([
        {
          type: 'action_required',
          message: 'warning for test_import_warning_2',
        },
      ]);
    });

    it('should display warnings coming from multiple types', async () => {
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_import_both_types.ndjson')
      );

      await PageObjects.savedObjects.checkImportSucceeded();
      const warnings = await PageObjects.savedObjects.getImportWarnings();

      expect(warnings).to.eql([
        {
          message: 'warning for test_import_warning_1',
          type: 'simple',
        },
        {
          type: 'action_required',
          message: 'warning for test_import_warning_2',
        },
      ]);
    });
  });
}
