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
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings']);
  const SCRIPTED_FIELD_NAME = 'myScriptedField';

  const scriptResultToJson = (scriptResult: string) => {
    try {
      return JSON.parse(scriptResult);
    } catch (e) {
      expect().fail(`Could JSON.parse script result: "${scriptResult}"`);
    }
  };

  describe('scripted fields preview', () => {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.createIndexPattern('logstash-*');

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickScriptedFieldsTab();
      await PageObjects.settings.clickAddScriptedField();
      await PageObjects.settings.setScriptedFieldName(SCRIPTED_FIELD_NAME);
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.removeLogstashIndexPatternIfExist();
    });

    it('should display script error when script is invalid', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(
        `i n v a l i d  s c r i p t`
      );
      expect(scriptResults).to.contain('search_phase_execution_exception');
    });

    it('should display script results when script is valid', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(
        `doc['bytes'].value * 2`
      );
      const [
        {
          _id,
          [SCRIPTED_FIELD_NAME]: { [0]: scriptedField },
        },
      ] = scriptResultToJson(scriptResults);
      expect(_id).to.be.a('string');
      expect(scriptedField).to.be.a('number');
      expect(scriptedField).to.match(/[0-9]+/);
    });

    it('should display additional fields', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(
        `doc['bytes'].value * 2`,
        'bytes'
      );
      const [{ _id, bytes }] = scriptResultToJson(scriptResults);
      expect(_id).to.be.a('string');
      expect(bytes).to.be.a('number');
    });
  });
}
