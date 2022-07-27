/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualBuilder, timePicker, visualize, visChart } = getPageObjects([
    'visualBuilder',
    'timePicker',
    'visualize',
    'visChart',
  ]);
  const retry = getService('retry');

  async function cleanupMarkdownData(variableName: 'variable' | 'label', checkedValue: string) {
    await visualBuilder.markdownSwitchSubTab('data');
    await visualBuilder.setMarkdownDataVariable('', variableName);
    await visualBuilder.markdownSwitchSubTab('markdown');
    const rerenderedTable = await visualBuilder.getMarkdownTableVariables();
    rerenderedTable.forEach((row) => {
      if (variableName === 'label') {
        expect(row.key).to.include.string(checkedValue);
      } else {
        expect(row.key).to.not.include.string(checkedValue);
      }
    });
  }

  describe('visual builder', function describeIndexTests() {
    describe('markdown', () => {
      before(async () => {
        await visualize.initTests();
        await visualBuilder.resetPage();
        await visualBuilder.clickMarkdown();
        await timePicker.setAbsoluteRange(
          'Sep 22, 2015 @ 06:00:00.000',
          'Sep 22, 2015 @ 11:00:00.000'
        );
        await visualBuilder.markdownSwitchSubTab('options');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.markdownSwitchSubTab('markdown');
      });

      it('should render subtabs and table variables markdown components', async () => {
        const tabs = await visualBuilder.getSubTabs();
        expect(tabs).to.have.length(3);

        const variables = await visualBuilder.getMarkdownTableVariables();
        expect(variables).not.to.be.empty();
        expect(variables).to.have.length(6);
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

      it('markdown variables should be clickable', async () => {
        await visualBuilder.clearMarkdown();
        const [firstVariable] = await visualBuilder.getMarkdownTableVariables();
        await firstVariable.selector.click();
        await visChart.waitForVisualizationRenderingStabilized();
        const markdownText = await visualBuilder.getMarkdownText();
        expect(markdownText).to.be('46');
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
          if (index >= table.length - 2) {
            expect(row.key).to.not.include.string(VARIABLE);
          } else {
            expect(row.key).to.include.string(VARIABLE);
          }
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

      describe('applying field formats from Advanced Settings for values', () => {
        before(async () => {
          await visualBuilder.resetPage();
          await visualBuilder.clickMarkdown();
          await visualBuilder.markdownSwitchSubTab('markdown');
          await visualBuilder.enterMarkdown('{{ average_of_bytes.last.formatted }}');
          await visualBuilder.markdownSwitchSubTab('data');
          await visualBuilder.selectAggType('Average');
          await visualBuilder.setFieldForAggregation('bytes');
          await visualBuilder.clickSeriesOption();
        });

        it('should apply field formatting by default', async () => {
          const text = await visualBuilder.getMarkdownText();
          expect(text).to.be('5.588KB');
        });

        it('should apply TSVB formatting', async () => {
          await visualBuilder.changeDataFormatter('percent');

          const text = await visualBuilder.getMarkdownText();
          expect(text).to.be('572,241.265%');
        });
      });
    });
  });
}
