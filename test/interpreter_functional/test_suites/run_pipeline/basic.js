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

import expect from 'expect.js';
import { expectExpressionProvider } from './helpers';
import { delay } from 'bluebird';

export default function ({ getService, updateBaselines }) {

  let expectExpression;
  describe('basic visualize loader pipeline expression tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    after(async () => {
      await delay(50000);
    });

    // we should not use this for tests like the ones below. this should be unit tested.
    describe('kibana function', () => {
      it('returns kibana_context', async () => {
        const result = await expectExpression('returns_kibana_context', 'kibana').getResponse();
        expect(result).to.have.property('type', 'kibana_context');
      });

      it('correctly sets timeRange', async () => {
        const result = await expectExpression('correctly_sets_timerange', 'kibana', {}, { timeRange: 'test' }).getResponse();
        expect(result).to.have.property('timeRange', 'test');
      });
    });

    // rather we want to use this to do integration tests.
    describe('full expression', () => {
      const expression = `kibana | kibana_context | esaggs index='logstash-*' aggConfigs='[
          {"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},
          {"id":"2","enabled":true,"type":"terms","schema":"segment","params":
            {"field":"response.raw","size":4,"order":"desc","orderBy":"1"}
          }]'  | 
        kibana_metric 
          visConfig='{"metrics":[{"accessor":1,"format":{"id":"number"},"params":{}}],"bucket":{"accessor":0}}'
      `;

      it ('runs the expression and compares final output', async () => {
        //await expectExpression(expression).toReturn({});
        await expectExpression('final_output_test', expression).toMatchSnapshot();
      });

      it ('runs the expression and compares output at every step', async () => {
        await expectExpression('step_output_test', expression).stepsToMatchSnapshot();
      });

      it ('runs the expression and compares screenshots', async () => {
        await expectExpression('final_screenshot_test', expression).toMatchScreenshot();
      });

      it('runs the expression and combines different checks', async () => {
        await expectExpression('combined_test', expression).stepsToMatchSnapshot().toReturn({}).toMatchScreenshot();
      });
    });

    describe('reusing partial results', () => {
      it ('does some screenshot comparisons', async () => {
        const context = await expectExpression('partial_test', 'kibana | esaggs').getResponse();

        await expectExpression('partial_test_1', 'tagcloud', context).toMatchScreenshot();
        await expectExpression('partial_test_2', 'metric', context).toMatchScreenshot();
        await expectExpression('partial_test_3', 'region_map', context).toMatchScreenshot();
      });
    });
  });
}
