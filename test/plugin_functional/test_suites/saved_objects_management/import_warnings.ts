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
