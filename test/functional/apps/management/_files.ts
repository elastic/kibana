/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'filesManagement']);
  const testSubjects = getService('testSubjects');

  describe('Files management', () => {
    before(async () => {
      await PageObjects.filesManagement.navigateTo();
    });

    it(`should render an empty prompt`, async () => {
      await testSubjects.existOrFail('filesManagementApp');

      const pageText = await (await testSubjects.find('filesManagementApp')).getVisibleText();

      expect(pageText).to.contain('No files found');
    });
  });
}
