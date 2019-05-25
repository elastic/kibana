/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export function HomePageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  class HomePage {
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
      await this._waitForSampleDataLoadingAction(id);
    }

    async removeSampleDataSet(id) {
      await testSubjects.click(`removeSampleDataSet${id}`);
      await this._waitForSampleDataLoadingAction(id);
    }

    // loading action is either uninstall and install
    async _waitForSampleDataLoadingAction(id) {
      const sampleDataCard = await testSubjects.find(`sampleDataSetCard${id}`);
      await retry.try(async () => {
        // waitForDeletedByCssSelector needs to be inside retry because it will timeout at least once
        // before action is complete
        await sampleDataCard.waitForDeletedByCssSelector('.euiLoadingSpinner');
      });
    }

    async launchSampleDataSet(id) {
      await testSubjects.click(`launchSampleDataSet${id}`);
    }

    async loadSavedObjects() {
      await retry.try(async () => {
        await testSubjects.click('loadSavedObjects');
        const successMsgExists = await testSubjects.exists('loadSavedObjects_success', {
          timeout: 5000
        });
        if (!successMsgExists) {
          throw new Error('Failed to load saved objects');
        }
      });
    }

  }

  return new HomePage();
}
