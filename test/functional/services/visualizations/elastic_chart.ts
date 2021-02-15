/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function ElasticChartProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');

  class ElasticChart {
    public async getCanvas() {
      return await find.byCssSelector('.echChart canvas:last-of-type');
    }

    public async canvasExists() {
      return await find.existsByCssSelector('.echChart canvas:last-of-type');
    }

    public async waitForRenderComplete(dataTestSubj: string) {
      const chart = await testSubjects.find(dataTestSubj);
      const rendered = await chart.findAllByCssSelector('.echChart[data-ech-render-complete=true]');
      expect(rendered).to.equal(
        1,
        `Rendering for elastic-chart with data-test-subj='${dataTestSubj}' was not finished in time`
      );
    }

    public async getVisualizationRenderingCount(dataTestSubj: string) {
      const chart = await testSubjects.find(dataTestSubj);
      const visContainer = await chart.findByCssSelector('.echChartStatus');
      const renderingCount = await visContainer.getAttribute('data-ech-render-count');
      return Number(renderingCount);
    }

    public async waitForRenderingCount(dataTestSubj: string, minimumCount: number) {
      await retry.waitFor(`rendering count to be equal to [${minimumCount}]`, async () => {
        const currentRenderingCount = await this.getVisualizationRenderingCount(dataTestSubj);
        log.debug(`-- currentRenderingCount=${currentRenderingCount}`);
        return currentRenderingCount >= minimumCount;
      });
    }
  }

  return new ElasticChart();
}
