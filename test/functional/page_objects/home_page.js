
export function HomePageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  //const PageObjects = getPageObjects(['common', 'header']);
  class HomePage {

    async clickKibanaIcon() {
      await testSubjects.click('kibanaLogo');
    }

    async clickSynopsis(title) {
      await testSubjects.click(`homeSynopsisLink${title}`);
    }


  }

  return new HomePage();
}
