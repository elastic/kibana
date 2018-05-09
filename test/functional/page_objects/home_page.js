
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

    async doesSampleDataSetExist(id) {
      return await testSubjects.exists(`sampleDataSetCard${id}`);
    }

    async doesSampleDataSetSuccessfulInstallToastExist() {
      return await testSubjects.exists('sampleDataSetInstallToast');
    }

    async doesSampleDataSetSuccessfulUninstallToastExist() {
      return await testSubjects.exists('sampleDataSetUninstallToast');
    }

    async isSampleDataSetInstalled(id) {
      return await testSubjects.exists(`removeSampleDataSet${id}`);
    }

    async addSampleDataSet(id) {
      await testSubjects.click(`addSampleDataSet${id}`);
    }

    async removeSampleDataSet(id) {
      await testSubjects.click(`removeSampleDataSet${id}`);
    }

    async launchSampleDataSet(id) {
      await testSubjects.click(`launchSampleDataSet${id}`);
    }

  }

  return new HomePage();
}
