/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { ExpectExpression, expectExpressionProvider } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

// this file showcases how to use testing utilities defined in helpers.ts together with the kbn_tp_run_pipeline
// test plugin to write automated tests for interpreter
export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;
  describe('basic visualize loader pipeline expression tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    // we should not use this for tests like the ones below. this should be unit tested.
    // - tests against a single function could easily be written as unit tests (and should be)
    describe('kibana function', () => {
      it('returns kibana_context', async () => {
        const result = await expectExpression('returns_kibana_context', 'kibana').getResponse();
        expect(result).to.have.property('type', 'kibana_context');
      });

      it('correctly sets timeRange', async () => {
        const result = await expectExpression(
          'correctly_sets_timerange',
          'kibana',
          {},
          { timeRange: 'test' }
        ).getResponse();
        expect(result).to.have.property('timeRange', 'test');
      });
    });

    // rather we want to use this to do integration tests.
    describe('full expression', () => {
      const expression = `kibana | kibana_context | esaggs index={indexPatternLoad id='logstash-*'}
        aggs={aggCount id="1" enabled=true schema="metric"}
        aggs={aggTerms id="2" enabled=true schema="segment" field="response.raw" size=4 order="desc" orderBy="1"}
        | metricVis metric={visdimension 1 format="number"} bucket={visdimension 0}
      `;

      // we can execute an expression and validate the result manually:
      // const response = await expectExpression(expression).getResponse();
      // expect(response)....

      // we can also do snapshot comparison of result of our expression
      // to update the snapshots run the tests with --updateBaselines
      it('runs the expression and compares final output', async () => {
        await expectExpression('final_output_test', expression).toMatchSnapshot();
      });

      // its also possible to check snapshot at every step of expression (after execution of each function)
      it('runs the expression and compares output at every step', async () => {
        await expectExpression('step_output_test', expression).steps.toMatchSnapshot();
      });

      // and we can do screenshot comparison of the rendered output of expression (if expression returns renderable)
      it('runs the expression and compares screenshots', async () => {
        await expectExpression('final_screenshot_test', expression).toMatchScreenshot();
      });

      // it is also possible to combine different checks
      it('runs the expression and combines different checks', async () => {
        await (
          await expectExpression('combined_test', expression).steps.toMatchSnapshot()
        ).toMatchScreenshot();
      });
    });

    // if we want to do multiple different tests using the same data, or reusing a part of expression its
    // possible to retrieve the intermediate result and reuse it in later expressions
    describe('reusing partial results', () => {
      it('does some screenshot comparisons', async () => {
        const expression = `kibana | kibana_context | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric"}
          aggs={aggTerms id="2" enabled=true schema="segment" field="response.raw" size=4 order="desc" orderBy="1"}
        `;
        // we execute the part of expression that fetches the data and store its response
        const context = await expectExpression('partial_test', expression).getResponse();

        // we reuse that response to render 3 different charts and compare screenshots with baselines
        const tagCloudExpr = `tagcloud metric={visdimension 1 format="number"} bucket={visdimension 0}`;
        await (
          await expectExpression('partial_test_1', tagCloudExpr, context).toMatchSnapshot()
        ).toMatchScreenshot();

        const metricExpr = `metricVis metric={visdimension 1 format="number"} bucket={visdimension 0}`;
        await (
          await expectExpression('partial_test_2', metricExpr, context).toMatchSnapshot()
        ).toMatchScreenshot();

        const regionMapExpr = `regionmap visConfig='{"metric":{"accessor":1,"format":{"id":"number"}},"bucket":{"accessor":0},"legendPosition":"bottomright","addTooltip":true,"colorSchema":"Yellow to Red","isDisplayWarning":true,"wms":{},"mapZoom":2,"mapCenter":[0,0],"outlineWeight":1,"showAllShapes":true,"selectedLayer":{},"selectedJoinField":{}}'`;
        await (
          await expectExpression('partial_test_3', regionMapExpr, context).toMatchSnapshot()
        ).toMatchScreenshot();
      });
    });
  });
}
