/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class TimelionPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly log = this.ctx.getService('log');
  private readonly common = this.ctx.getPageObject('common');
  private readonly esArchiver = this.ctx.getService('esArchiver');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  public async initTests() {
    await this.kibanaServer.uiSettings.replace({
      defaultIndex: 'logstash-*',
    });

    this.log.debug('load kibana index');
    await this.esArchiver.load('test/functional/fixtures/es_archiver/timelion');

    await this.common.navigateToApp('timelion');
  }

  public async setExpression(expression: string) {
    const input = await this.testSubjects.find('timelionExpressionTextArea');
    await input.clearValue();
    await input.type(expression);
  }

  public async updateExpression(updates: string) {
    const input = await this.testSubjects.find('timelionExpressionTextArea');
    await input.type(updates);
    await this.common.sleep(1000);
  }

  public async getExpression() {
    const input = await this.testSubjects.find('timelionExpressionTextArea');
    return input.getVisibleText();
  }

  public async getSuggestionItemsText() {
    const elements = await this.testSubjects.findAll('timelionSuggestionListItem');
    return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
  }

  public async clickSuggestion(suggestionIndex = 0, waitTime = 1000) {
    const elements = await this.testSubjects.findAll('timelionSuggestionListItem');
    if (suggestionIndex > elements.length) {
      throw new Error(
        `Unable to select suggestion ${suggestionIndex}, only ${elements.length} suggestions available.`
      );
    }
    await elements[suggestionIndex].click();
    // Wait for timelion expression to be updated after clicking suggestions
    await this.common.sleep(waitTime);
  }

  public async saveTimelionSheet() {
    await this.testSubjects.click('timelionSaveButton');
    await this.testSubjects.click('timelionSaveAsSheetButton');
    await this.testSubjects.click('timelionFinishSaveButton');
    await this.testSubjects.existOrFail('timelionSaveSuccessToast');
    await this.testSubjects.waitForDeleted('timelionSaveSuccessToast');
  }

  public async expectWriteControls() {
    await this.testSubjects.existOrFail('timelionSaveButton');
    await this.testSubjects.existOrFail('timelionDeleteButton');
  }

  public async expectMissingWriteControls() {
    await this.testSubjects.missingOrFail('timelionSaveButton');
    await this.testSubjects.missingOrFail('timelionDeleteButton');
  }
}
