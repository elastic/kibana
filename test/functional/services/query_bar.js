export function QueryBarProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['header']);

  class QueryBar {

    async getQueryString() {
      return await testSubjects.getProperty('queryInput', 'value');
    }

    async setQuery(query) {
      log.debug(`QueryBar.setQuery(${query})`);
      // Extra caution used because of flaky test here: https://github.com/elastic/kibana/issues/16978 doesn't seem
      // to be actually setting the query in the query input based off
      await retry.try(async () => {
        await testSubjects.setValue('queryInput', query);
        const currentQuery = await this.getQueryString();
        if (currentQuery !== query) {
          throw new Error(`Failed to set query input to ${query}, instead query is ${currentQuery}`);
        }
      });
    }

    async submitQuery() {
      log.debug('QueryBar.submitQuery');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

  }

  return new QueryBar();
}
