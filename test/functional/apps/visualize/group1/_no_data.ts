/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['visualize', 'header', 'common']);
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');

  const createDataView = async (dataViewName: string) => {
    await testSubjects.setValue('createIndexPatternTitleInput', dataViewName, {
      clearWithKeyboard: true,
      typeCharByChar: true,
    });
    await testSubjects.click('saveIndexPatternButton');
  };

  describe('no data in visualize', function () {
    it('should show the integrations component if there is no data', async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.unload('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await PageObjects.common.navigateToApp('visualize');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const addIntegrations = await testSubjects.find('kbnOverviewAddIntegrations');
      await addIntegrations.click();
      await PageObjects.common.waitUntilUrlIncludes('integrations/browse');
    });

    it('should show the no dataview component if no dataviews exist', async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await PageObjects.common.navigateToApp('visualize');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const button = await testSubjects.find('createDataViewButton');
      button.click();
      await retry.waitForWithTimeout('index pattern editor form to be visible', 15000, async () => {
        return await (await find.byClassName('indexPatternEditor__form')).isDisplayed();
      });

      const dataViewToCreate = 'logstash';
      await createDataView(dataViewToCreate);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitForWithTimeout(
        'data view selector to include a newly created dataview',
        5000,
        async () => {
          const addNewVizButton = await testSubjects.exists('newItemButton');
          expect(addNewVizButton).to.be(true);
          return addNewVizButton;
        }
      );
    });
  });
}
