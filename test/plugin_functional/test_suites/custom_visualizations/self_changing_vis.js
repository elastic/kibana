/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const renderable = getService('renderable');
  const PageObjects = getPageObjects(['common', 'visualize', 'visEditor']);

  async function getCounterValue() {
    return await testSubjects.getVisibleText('counter');
  }

  describe('self changing vis', function describeIndexTests() {
    before(async () => {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickVisType('self_changing_vis');
    });

    it('should allow updating params via the editor', async () => {
      const editor = await testSubjects.find('counterEditor');
      await editor.clearValue();
      await editor.type('10');
      const isApplyEnabled = await PageObjects.visEditor.isApplyEnabled();
      expect(isApplyEnabled).to.be(true);
      await PageObjects.visEditor.clickGo();
      await renderable.waitForRender();
      const counter = await getCounterValue();
      expect(counter).to.be('10');
    });

    it.skip('should allow changing params from within the vis', async () => {
      await testSubjects.click('counter');
      await renderable.waitForRender();
      const visValue = await getCounterValue();
      expect(visValue).to.be('11');
      const editorValue = await testSubjects.getAttribute('counterEditor', 'value');
      expect(editorValue).to.be('11');
      // If changing a param from within the vis it should immediately apply and not bring editor in an unchanged state
      const isApplyEnabled = await PageObjects.visEditor.isApplyEnabled();
      expect(isApplyEnabled).to.be(false);
    });
  });
}
