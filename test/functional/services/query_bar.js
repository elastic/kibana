export function QueryBarProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  class QueryBar {

    async getQueryString() {
      const queryInput = await testSubjects.find('queryInput');
      return await queryInput.getProperty('value');
    }

  }

  return new QueryBar();
}
