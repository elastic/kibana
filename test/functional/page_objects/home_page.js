import _ from 'lodash';

export function HomePageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const config = getService('config');
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HomePage {

    async clickKibanaIcon() {
      await testSubjects.click('kibanaLogo');
    }

    async clickSynopsis(title){
      await testSubjects.click(`homeSynopsisLink${title}`);
    }


  }

  return new HomePage();
}
