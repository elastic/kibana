/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpectExpression, expectExpressionProvider, ExpressionResult } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;
  describe('metricVis pipeline expression tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    describe('correctly renders metric', () => {
      let dataContext: ExpressionResult;
      before(async () => {
        const expression = `kibana | kibana_context | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric"}
          aggs={aggMax id="1" enabled=true schema="metric" field="bytes"}
          aggs={aggTerms id="2" enabled=true schema="segment" field="response.raw" size=4 order="desc" orderBy="1"}`;
        // we execute the part of expression that fetches the data and store its response
        dataContext = await expectExpression('partial_metric_test', expression).getResponse();
      });

      it('with empty data', async () => {
        const expression = 'metricVis metric={visdimension 0}';
        await (
          await expectExpression('metric_empty_data', expression, {
            ...dataContext,
            rows: [],
          }).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with single metric data', async () => {
        const expression = 'metricVis metric={visdimension 0}';
        await (
          await expectExpression(
            'metric_single_metric_data',
            expression,
            dataContext
          ).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with multiple metric data', async () => {
        const expression = 'metricVis metric={visdimension 0} metric={visdimension 1}';
        await (
          await expectExpression(
            'metric_multi_metric_data',
            expression,
            dataContext
          ).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with metric and bucket data', async () => {
        const expression = 'metricVis metric={visdimension 0} bucket={visdimension 2}';
        await (
          await expectExpression('metric_all_data', expression, dataContext).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with percentageMode option', async () => {
        const expression =
          'metricVis metric={visdimension 0} percentageMode=true \
            palette={palette stop=0 color="rgb(0,0,0,0)" stop=10000 color="rgb(100, 100, 100)" range="number" continuity="none"}';
        await (
          await expectExpression(
            'metric_percentage_mode',
            expression,
            dataContext
          ).toMatchSnapshot()
        ).toMatchScreenshot();
      });
    });

    describe('throws error at metric', () => {
      it('with invalid data', async () => {
        const expression = 'metricVis metric={visdimension 0}';
        await (
          await expectExpression('metric_invalid_data', expression).toMatchSnapshot()
        ).toMatchScreenshot();
      });
    });
  });
}
