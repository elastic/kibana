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

import expect from '@kbn/expect';

export default function({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const pieChart = getService('pieChart');
  const dashboardExpect = getService('dashboardExpect');

  describe('dashboard container', () => {
    before(async () => {
      await testSubjects.click('embedExplorerTab-dashboardContainer');
    });

    it('hello world embeddable renders', async () => {
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('helloWorldEmbeddable');
        expect(text).to.be('HELLO WORLD!');
      });
    });

    it('contact card embeddable renders', async () => {
      await testSubjects.existOrFail('embeddablePanelHeading-HelloSue');
    });

    it('pie charts', async () => {
      await pieChart.expectPieSliceCount(5);
    });

    it('markdown', async () => {
      await dashboardExpect.markdownWithValuesExists(["I'm a markdown!"]);
    });

    it('saved search', async () => {
      await dashboardExpect.savedSearchRowCount(50);
    });
  });
}
