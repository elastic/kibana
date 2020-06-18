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
  const { visualize, visualBuilder } = getPageObjects(['visualBuilder', 'visualize']);
  const retry = getService('retry');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  describe('visual builder', function describeIndexTests() {
    beforeEach(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
    });

    describe('Time Series', () => {
      beforeEach(async () => {
        await visualBuilder.resetPage();
      });

      it('should render all necessary components', async () => {
        await visualBuilder.checkTimeSeriesChartIsPresent();
        await visualBuilder.checkTimeSeriesLegendIsPresent();
      });

      it('should show the correct count in the legend', async () => {
        await retry.try(async () => {
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be('156');
        });
      });

      it('should show the correct count in the legend with 2h offset', async () => {
        await visualBuilder.clickSeriesOption();
        await visualBuilder.enterOffsetSeries('2h');
        const actualCount = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('293');
      });

      it('should show the correct count in the legend with -2h offset', async () => {
        await visualBuilder.clickSeriesOption();
        await visualBuilder.enterOffsetSeries('-2h');
        const actualCount = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('53');
      });

      it('should open color picker, deactivate panel and clone series', async () => {
        await visualBuilder.clickColorPicker();
        await visualBuilder.checkColorPickerPopUpIsPresent();
        await visualBuilder.clickColorPicker();

        await visualBuilder.changePanelPreview();
        await visualBuilder.checkPreviewIsDisabled();
        await visualBuilder.changePanelPreview();

        await visualBuilder.cloneSeries();
        const legend = await visualBuilder.getLegendItems();
        const series = await visualBuilder.getSeries();
        expect(legend.length).to.be(2);
        expect(series.length).to.be(2);
      });

      it('should show the correct count in the legend with custom numeric formatter', async () => {
        const expectedLegendValue = '$ 156';

        await visualBuilder.clickSeriesOption();
        await visualBuilder.enterSeriesTemplate('$ {{value}}');
        const actualCount = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be(expectedLegendValue);
      });

      it('should show the correct count in the legend with percent formatter', async () => {
        const expectedLegendValue = '15,600%';

        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('Percent');
        const actualCount = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be(expectedLegendValue);
      });

      it('should show the correct count in the legend with bytes formatter', async () => {
        const expectedLegendValue = '156B';

        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('Bytes');
        const actualCount = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be(expectedLegendValue);
      });

      it.skip('should show the correct count in the legend with "Human readable" duration formatter', async () => {
        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('Duration');
        await visualBuilder.setDurationFormatterSettings({ to: 'Human readable' });
        const actualCountDefault = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCountDefault).to.be('a few seconds');

        log.debug(`to: 'Human readable', from: 'Seconds'`);
        await visualBuilder.setDurationFormatterSettings({ to: 'Human readable', from: 'Seconds' });
        const actualCountSec = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCountSec).to.be('3 minutes');

        log.debug(`to: 'Human readable', from: 'Minutes'`);
        await visualBuilder.setDurationFormatterSettings({ to: 'Human readable', from: 'Minutes' });
        const actualCountMin = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCountMin).to.be('3 hours');
      });

      describe('Dark mode', () => {
        before(async () => {
          await kibanaServer.uiSettings.update({
            'theme:darkMode': true,
          });
        });

        it(`viz should have light class when background color is white`, async () => {
          await visualBuilder.clickPanelOptions('timeSeries');
          await visualBuilder.setBackgroundColor('#FFFFFF');

          expect(await visualBuilder.checkTimeSeriesIsLight()).to.be(true);
        });

        after(async () => {
          await kibanaServer.uiSettings.update({
            'theme:darkMode': false,
          });
        });
      });
    });
  });
}
