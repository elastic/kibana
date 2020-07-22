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
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualBuilder, timePicker } = getPageObjects(['visualBuilder', 'timePicker']);
  const retry = getService('retry');

  async function cleanupMarkdownData(variableName: 'variable' | 'label', checkedValue: string) {
    await visualBuilder.markdownSwitchSubTab('data');
    await visualBuilder.setMarkdownDataVariable('', variableName);
    await visualBuilder.markdownSwitchSubTab('markdown');
    const rerenderedTable = await visualBuilder.getMarkdownTableVariables();
    rerenderedTable.forEach((row) => {
      // eslint-disable-next-line no-unused-expressions
      variableName === 'label'
        ? expect(row.key).to.include.string(checkedValue)
        : expect(row.key).to.not.include.string(checkedValue);
    });
  }

  describe('visual builder', function describeIndexTests() {
    describe('markdown', () => {
      before(async () => {
        await visualBuilder.resetPage();
        await visualBuilder.clickMarkdown();
        await timePicker.setAbsoluteRange(
          'Sep 22, 2015 @ 06:00:00.000',
          'Sep 22, 2015 @ 11:00:00.000'
        );
      });

      it('should render subtabs and table variables markdown components', async () => {
        const tabs = await visualBuilder.getSubTabs();
        expect(tabs).to.have.length(3);

        const variables = await visualBuilder.getMarkdownTableVariables();
        expect(variables).not.to.be.empty();
        expect(variables).to.have.length(5);
      });

      it('should allow printing raw timestamp of data', async () => {
        await visualBuilder.enterMarkdown('{{ count.data.raw.[0].[0] }}');
        const text = await visualBuilder.getMarkdownText();
        expect(text).to.be('1442901600000');
      });

      it('should allow printing raw value of data', async () => {
        await visualBuilder.enterMarkdown('{{ count.data.raw.[0].[1] }}');
        const text = await visualBuilder.getMarkdownText();
        expect(text).to.be('6');
      });

      it('should render html as plain text', async () => {
        const html = '<h1>hello world</h1>';
        await visualBuilder.enterMarkdown(html);
        const markdownText = await visualBuilder.getMarkdownText();
        expect(markdownText).to.be(html);
      });

      it('should render mustache list', async () => {
        const list = '{{#each _all}}\n{{ data.formatted.[0] }} {{ data.raw.[0] }}\n{{/each}}';
        const expectedRenderer = 'Sep 22, 2015 @ 06:00:00.000,6 1442901600000,6';
        await visualBuilder.enterMarkdown(list);
        const markdownText = await visualBuilder.getMarkdownText();
        expect(markdownText).to.be(expectedRenderer);
      });
      it('should render markdown table', async () => {
        const TABLE =
          '| raw | formatted |\n|-|-|\n| {{count.last.raw}} | {{count.last.formatted}} |';
        const DATA = '46';

        await visualBuilder.enterMarkdown(TABLE);
        const text = await visualBuilder.getMarkdownText();
        const tableValues = text.split('\n').map((row) => row.split(' '))[1]; // [46, 46]

        tableValues.forEach((value) => {
          expect(value).to.be.equal(DATA);
        });
      });

      it('should change variable name', async () => {
        const VARIABLE = 'variable';
        await visualBuilder.markdownSwitchSubTab('data');

        await visualBuilder.setMarkdownDataVariable(VARIABLE, VARIABLE);
        await visualBuilder.markdownSwitchSubTab('markdown');
        const table = await visualBuilder.getMarkdownTableVariables();

        table.forEach((row, index) => {
          // exception: last index for variable is always: {{count.label}}
          // eslint-disable-next-line no-unused-expressions
          index === table.length - 1
            ? expect(row.key).to.not.include.string(VARIABLE)
            : expect(row.key).to.include.string(VARIABLE);
        });

        await cleanupMarkdownData(VARIABLE, VARIABLE);
      });

      it('series count should be 2 after cloning', async () => {
        await visualBuilder.markdownSwitchSubTab('data');
        await visualBuilder.cloneSeries();

        await retry.try(async function seriesCountCheck() {
          const seriesLength = (await visualBuilder.getSeries()).length;
          expect(seriesLength).to.be.equal(2);
        });
      });

      it('aggregation count should be 2 after cloning', async () => {
        await visualBuilder.markdownSwitchSubTab('data');
        await visualBuilder.createNewAgg();

        await retry.try(async function aggregationCountCheck() {
          const aggregationLength = await visualBuilder.getAggregationCount();
          expect(aggregationLength).to.be.equal(2);
        });
      });
    });
  });
}
