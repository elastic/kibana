export function TimelionPageProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header']);
  const defaultFindTimeout = config.get('timeouts.find');

  class TimelionPage {
    async setExpression(expression) {
      const input = await testSubjects.find('timelionExpressionTextArea');
      await input.clearValue();
      await input.type(expression);
    }
  }

  return new TimelionPage();
}
