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

import { DebugState } from '@elastic/charts';

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

export function ElasticChartProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');

  class ElasticChart {
    public async getCanvas() {
      return await find.byCssSelector('.echChart canvas:last-of-type');
    }

    public async canvasExists() {
      return await find.existsByCssSelector('.echChart canvas:last-of-type');
    }

    public async waitForRenderComplete(dataTestSubj?: string) {
      const chart = await this.getChart(dataTestSubj);
      const rendered = await chart.findAllByCssSelector(
        '.echChartStatus[data-ech-render-complete=true]'
      );
      expect(rendered.length).to.equal(1);
    }

    public async getVisualizationRenderingCount(dataTestSubj?: string) {
      const chart = await this.getChart(dataTestSubj);
      const visContainer = await chart.findByCssSelector('.echChartStatus');
      const renderingCount = await visContainer.getAttribute('data-ech-render-count');
      return Number(renderingCount);
    }

    public async waitForRenderingCount(minimumCount: number, dataTestSubj?: string) {
      await retry.waitFor(`rendering count to be equal to [${minimumCount}]`, async () => {
        const currentRenderingCount = await this.getVisualizationRenderingCount(dataTestSubj);
        log.debug(`-- currentRenderingCount=${currentRenderingCount}`);
        return currentRenderingCount >= minimumCount;
      });
    }

    public async hasChart(dataTestSubj?: string, timeout?: number): Promise<boolean> {
      if (dataTestSubj) {
        return await testSubjects.exists(dataTestSubj, { timeout });
      } else {
        const charts = await this.getAllCharts(timeout);

        return charts.length > 0;
      }
    }

    private async getChart(
      dataTestSubj?: string,
      timeout?: number,
      match: number = 0
    ): Promise<WebElementWrapper> {
      if (dataTestSubj) {
        if (!(await testSubjects.exists(dataTestSubj, { timeout }))) {
          throw Error(`Failed to find an elastic-chart with testSubject '${dataTestSubj}'`);
        }

        return (await testSubjects.findAll(dataTestSubj))[match];
      } else {
        const charts = await this.getAllCharts(timeout);
        if (charts.length === 0) {
          throw Error(`Failed to find any elastic-charts on the page`);
        } else {
          return charts[match];
        }
      }
    }

    private async getAllCharts(timeout?: number) {
      return await find.allByCssSelector('.echChart', timeout);
    }

    /**
     * used to get chart data from `@elastic/charts`
     * requires `window._echDebugStateFlag` to be true
     */
    public async getChartDebugData(
      dataTestSubj?: string,
      match: number = 0
    ): Promise<DebugState | null> {
      const chart = await this.getChart(dataTestSubj, undefined, match);

      try {
        const visContainer = await chart.findByCssSelector('.echChartStatus');
        const debugDataString: string | undefined = await visContainer.getAttribute(
          'data-ech-debug-state'
        );
        return debugDataString ? JSON.parse(debugDataString) : null;
      } catch (error) {
        throw Error('Elastic charts debugState not found');
      }
    }

    /**
     * Used to set a flag on the window to trigger debug state on elastic charts
     * @param value
     */
    public async setNewChartUiDebugFlag(value = true) {
      await browser.execute<[boolean], void>((v) => {
        window._echDebugStateFlag = v;
      }, value);
    }
  }

  return new ElasticChart();
}
