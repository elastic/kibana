/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  // run-examples
  // go to localhost:5601/app/developerExamples
  // in input type="search" euiFieldSearch class
  // value="report"
  // click button need to add a data-test-subj
  describe('Example app of reporting functionality', async () => {
    
    it('', async () => {
    await PageObjects.common.navigateToApp('developerExamples');
    console.log(PageObjects);
    await testSubjects.click('euiFieldSearch');
    })
  });
};
