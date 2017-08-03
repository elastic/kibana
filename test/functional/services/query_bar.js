export function QueryBarProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  class QueryBar {

    async getQueryString() {
      const queryInput = await testSubjects.find('queryInput');
      return await queryInput.getProperty('value');
    }

    async hasLanguageSwitcher() {
      return await testSubjects.exists('queryBarLanguageSwitcher');
    }

    async getLanguageSwitcher() {
      return await testSubjects.find('queryBarLanguageSwitcher');
    }

    async getCurrentLanguage() {
      const languageSwitcher = await this.getLanguageSwitcher();
      const selectedOption = await languageSwitcher.findByCssSelector('option[selected="selected"]');
      return await selectedOption.getVisibleText();
    }

    async setLanguage(language) {
      const languageSwitcher = await this.getLanguageSwitcher();
      await languageSwitcher.click();

      const requestedOption = await find.byCssSelector(`option[label="${language}"]`);
      await requestedOption.click();
    }

  }

  return new QueryBar();
}
