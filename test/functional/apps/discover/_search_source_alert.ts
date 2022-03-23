/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { asyncMap, asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects([
    'settings',
    'common',
    'header',
    'discover',
    'timePicker',
    'dashboard',
  ]);
  const deployment = getService('deployment');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');

  const queryBar = getService('queryBar');

  const SOURCE_DATA_INDEX = 'search-source-alert';
  const OUTPUT_DATA_INDEX = 'search-source-alert-output';
  const ACTION_TYPE_ID = '.index';

  const createSourceIndex = () =>
    es.index({
      index: SOURCE_DATA_INDEX,
      body: {
        settings: { number_of_shards: 1 },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'text' },
          },
        },
      },
    });

  const generateNewDocs = async (docsNumber: number) => {
    const mockMessages = new Array(docsNumber).map((current) => `msg-${current}`);
    const dateNow = new Date().toISOString();
    for (const message of mockMessages) {
      await es.transport.request({
        path: `/${SOURCE_DATA_INDEX}/_doc`,
        method: 'POST',
        body: {
          '@timestamp': dateNow,
          message,
        },
      });
    }
  };

  const createOutputDataIndex = () =>
    es.index({
      index: OUTPUT_DATA_INDEX,
      body: {
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          properties: {
            rule_id: { type: 'text' },
            rule_name: { type: 'text' },
            alert_id: { type: 'text' },
            context_message: { type: 'text' },
          },
        },
      },
    });

  const deleteIndexes = () =>
    asyncForEach([SOURCE_DATA_INDEX, OUTPUT_DATA_INDEX], async (indexName) => {
      await es.transport.request({
        path: `/${indexName}`,
        method: 'DELETE',
      });
    });

  const deleteAlerts = (alertIds: string[]) =>
    asyncForEach(alertIds, async (alertId: string) => {
      await supertest
        .delete(`/api/alerting/rule/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
    });

  const getAlertsByName = async (name: string) => {
    const {
      body: { data: alerts },
    } = await supertest
      .get(`/api/alerting/rules/_find?search=${name}&search_fields=name`)
      .expect(200);

    return alerts;
  };

  const createDataViews = () =>
    asyncMap(
      [SOURCE_DATA_INDEX, OUTPUT_DATA_INDEX],
      async (dataView: string) =>
        await supertest
          .post(`/api/data_views/data_view`)
          .set('kbn-xsrf', 'foo')
          .send({ data_view: { title: dataView, timeFieldName: '@timestamp' } })
          .expect(200)
    );

  const createConnector = async (): Promise<string> => {
    const { body: createdAction } = await supertest
      .post(`/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'search-source-alert-test-connector',
        connector_type_id: ACTION_TYPE_ID,
        config: { index: OUTPUT_DATA_INDEX },
        secrets: {},
      })
      .expect(200);

    return createdAction.id;
  };

  const deleteConnector = (connectorId: string) =>
    supertest
      .delete(`/api/actions/connector/${connectorId}`)
      .set('kbn-xsrf', 'foo')
      .expect(204, '');

  const deleteDataViews = (alertIds: string[]) =>
    asyncForEach(
      alertIds,
      async (dataView: string) =>
        await supertest
          .delete(`/api/data_views/data_view/${dataView}`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
    );

  const defineSearchSourceAlert = async (alertName: string) => {
    await testSubjects.click('discoverAlertsButton');
    await testSubjects.click('discoverCreateAlertButton');

    await testSubjects.setValue('ruleNameInput', alertName);
    await testSubjects.click('thresholdPopover');
    await testSubjects.setValue('alertThresholdInput', '3');
    await testSubjects.click('.index-ActionTypeSelectOption');

    await monacoEditor.setCodeEditorValue(`{
      "rule_id": "{{ruleId}}",
      "rule_name": "{{ruleName}}",
      "alert_id": "{{alertId}}",
      "context_message": "{{context.message}}"
    }`);
    await testSubjects.click('saveRuleButton');
  };

  const getLastToast = async () => {
    const toastList = await testSubjects.find('globalToastList');
    const titleElement = await toastList.findByCssSelector('.euiToastHeader');
    const title: string = await titleElement.getVisibleText();
    const messageElement = await toastList.findByCssSelector('.euiToastBody');
    const message: string = await messageElement.getVisibleText();
    return { message, title };
  };

  describe('Search source Alert', () => {
    const ruleName = 'test-search-source-alert';
    let sourceDataViewId: string;
    let outputDataViewId: string;
    let connectorId: string;

    beforeEach(async () => {
      // init test data
      await createSourceIndex();
      await generateNewDocs(5);
      await createOutputDataIndex();
      const [sourceDataViewResponse, outputDataViewResponse] = await createDataViews();
      connectorId = await createConnector();
      sourceDataViewId = sourceDataViewResponse.body.data_view.id;
      outputDataViewId = outputDataViewResponse.body.data_view.id;
    });

    afterEach(async () => {
      // clean up test data
      await deleteIndexes();
      await deleteDataViews([sourceDataViewId, outputDataViewId]);
      await deleteConnector(connectorId);
      const alertsToDelete = await getAlertsByName(ruleName);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
    });

    it('should successfully trigger alert', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.selectIndexPattern(SOURCE_DATA_INDEX);
      await PageObjects.timePicker.setCommonlyUsedTime('Last_15 minutes');

      // create an alert
      await defineSearchSourceAlert(ruleName);

      // open output index
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.selectIndexPattern(OUTPUT_DATA_INDEX);

      const [{ id: alertId }] = await getAlertsByName(ruleName);
      await queryBar.setQuery(`alert_id:${alertId}`);
      await queryBar.submitQuery();

      // waiting for alert to be triggered
      await retry.waitFor('doc count to be 1', async () => {
        const docCount = await dataGrid.getDocCount();
        return docCount >= 1;
      });

      // getting link
      await dataGrid.clickRowToggle();
      await testSubjects.click('collapseBtn');
      const contextMessageElement = await testSubjects.find(
        'tableDocViewRow-context_message-value'
      );
      const contextMessage = await contextMessageElement.getVisibleText();
      const [, link] = contextMessage.split(`Link\: `);
      const baseUrl = deployment.getHostPort();

      // following ling provided by alert to see documents triggered the alert
      await browser.navigateTo(baseUrl + link);
      await PageObjects.discover.waitUntilSearchingHasFinished();

      const { message, title } = await getLastToast();
      const docsNumber = await dataGrid.getDocCount();

      expect(await browser.getCurrentUrl()).to.contain(sourceDataViewId);
      expect(docsNumber).to.be(5);
      expect(title).to.be.equal('Displayed documents may vary');
      expect(message).to.be.equal(
        'The displayed documents might differ from the documents that triggered the alert. Some documents might have been added or deleted.'
      );
    });
  });
}
