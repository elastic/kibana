
export function HomePageProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  class HomePage {

    async clickKibanaIcon() {
      await testSubjects.click('kibanaLogo');
    }

    async clickSynopsis(title) {
      await testSubjects.click(`homeSynopsisLink${title}`);
    }

    async doesSynopsisExist(title) {
      return await testSubjects.exists(`homeSynopsisLink${title}`);
    }

  }

  return new HomePage();
}
