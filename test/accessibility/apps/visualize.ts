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

import { FtrProviderContext } from '../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'header',
    'timePicker',
  ]);
  const a11y = getService('a11y');
  const pieChart = getService('pieChart');
  const vizName = 'A11y markdown';
  const vizName1 = 'A11y pie chart';
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('Visualize', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        'format:bytes:defaultPattern': '0,0.[000]b',
      });
    });

    it('visualize', async () => {
      await a11y.testAppSnapshot();
    });

    it('click on create visualize wizard', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await a11y.testAppSnapshot();
    });

    it.skip('create visualize button', async () => {
      await PageObjects.visualize.clickNewVisualization();
      await a11y.testAppSnapshot();
    });

    it('a11y test on create a markdown viz', async () => {
      await PageObjects.visualize.createSimpleMarkdownViz(vizName);
      await a11y.testAppSnapshot();
    });

    it('a11y test on create a pie chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickPieChart();
      await a11y.testAppSnapshot();
      await PageObjects.visualize.clickNewSearch();
      await a11y.testAppSnapshot();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await a11y.testAppSnapshot();
      await PageObjects.visEditor.clickBucket('Split slices');
      await a11y.testAppSnapshot();
      await PageObjects.visEditor.selectAggregation('Histogram');
      await a11y.testAppSnapshot();
      await PageObjects.visEditor.selectField('memory');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(1003);
      await a11y.testAppSnapshot();
      await PageObjects.visEditor.setInterval('40000', { type: 'numeric' });
      await a11y.testAppSnapshot();
      await PageObjects.visEditor.clickGo();
    });
  });
}
