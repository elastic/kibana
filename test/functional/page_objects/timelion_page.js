export function TimelionPageProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  class TimelionPage {
    async initTests() {
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });

      log.debug('load kibana index');
      await esArchiver.load('timelion');

      await PageObjects.common.navigateToApp('timelion');
    }

    async setExpression(expression) {
      const input = await testSubjects.find('timelionExpressionTextArea');
      await input.clearValue();
      await input.type(expression);
    }

    async updateExpression(updates) {
      const input = await testSubjects.find('timelionExpressionTextArea');
      await input.type(updates);
      await PageObjects.common.sleep(500);
    }

    async getExpression() {
      const input = await testSubjects.find('timelionExpressionTextArea');
      return input.getVisibleText();
    }

    async getSuggestionItemsText() {
      const elements = await find.allByCssSelector('.suggestions .suggestion');
      return await Promise.all(elements.map(async element => await element.getVisibleText()));
    }

    async clickSuggestion(suggestionIndex = 0, waitTime = 500) {
      const elements = await find.allByCssSelector('.suggestions .suggestion');
      if (suggestionIndex > elements.length) {
        throw new Error(`Unable to select suggestion ${suggestionIndex}, only ${elements.length} suggestions available.`);
      }
      await elements[suggestionIndex].click();
      // Wait for timelion expression to be updated after clicking suggestions
      await PageObjects.common.sleep(waitTime);
    }
  }

  return new TimelionPage();
}
