/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings']);
  const esArchiver = getService('esArchiver');

  // FLAKY: https://github.com/elastic/kibana/issues/128558
  // Failing: See https://github.com/elastic/kibana/issues/130190
  describe.skip('data view filter', function describeIndexTests() {
    before(async function () {
      await esArchiver.emptyKibanaIndex();
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });

    beforeEach(async function () {
      await PageObjects.settings.createIndexPattern('logstash-*');
    });

    afterEach(async function () {
      await PageObjects.settings.removeIndexPattern();
    });

    it('should filter indexed fields', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.getFieldTypes();
      await PageObjects.settings.setFieldTypeFilter('keyword');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('keyword');
        }
      });
      await PageObjects.settings.clearFieldTypeFilter('keyword');

      await PageObjects.settings.setFieldTypeFilter('long');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('long');
        }
      });
      await PageObjects.settings.clearFieldTypeFilter('long');
    });
  });
}
