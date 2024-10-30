/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['settings']);

  describe('edit field', function () {
    before(async function () {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('field preview', function fieldPreview() {
      before(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
      });

      it('should show preview for fields in _source', async function () {
        await PageObjects.settings.changeAndValidateFieldFormat({
          name: 'extension',
          fieldType: 'text',
          expectedPreviewText: 'css',
        });
      });

      it('should show preview for fields not in _source', async function () {
        await PageObjects.settings.changeAndValidateFieldFormat({
          name: 'extension.raw',
          fieldType: 'keyword',
          expectedPreviewText: 'css',
        });
      });
    });
  });
}
