/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function TimelionPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  class TimelionPage {
    public async initTests() {
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index');
      await esArchiver.load('timelion');

      await PageObjects.common.navigateToApp('timelion');
    }

    public async setExpression(expression: string) {
      const input = await testSubjects.find('timelionExpressionTextArea');
      await input.clearValue();
      await input.type(expression);
    }

    public async updateExpression(updates: string) {
      const input = await testSubjects.find('timelionExpressionTextArea');
      await input.type(updates);
      await PageObjects.common.sleep(1000);
    }

    public async getExpression() {
      const input = await testSubjects.find('timelionExpressionTextArea');
      return input.getVisibleText();
    }

    public async getSuggestionItemsText() {
      const elements = await testSubjects.findAll('timelionSuggestionListItem');
      return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
    }

    public async clickSuggestion(suggestionIndex = 0, waitTime = 1000) {
      const elements = await testSubjects.findAll('timelionSuggestionListItem');
      if (suggestionIndex > elements.length) {
        throw new Error(
          `Unable to select suggestion ${suggestionIndex}, only ${elements.length} suggestions available.`
        );
      }
      await elements[suggestionIndex].click();
      // Wait for timelion expression to be updated after clicking suggestions
      await PageObjects.common.sleep(waitTime);
    }

    public async saveTimelionSheet() {
      await testSubjects.click('timelionSaveButton');
      await testSubjects.click('timelionSaveAsSheetButton');
      await testSubjects.click('timelionFinishSaveButton');
      await testSubjects.existOrFail('timelionSaveSuccessToast');
      await testSubjects.waitForDeleted('timelionSaveSuccessToast');
    }

    public async expectWriteControls() {
      await testSubjects.existOrFail('timelionSaveButton');
      await testSubjects.existOrFail('timelionDeleteButton');
    }

    public async expectMissingWriteControls() {
      await testSubjects.missingOrFail('timelionSaveButton');
      await testSubjects.missingOrFail('timelionDeleteButton');
    }
  }

  return new TimelionPage();
}
