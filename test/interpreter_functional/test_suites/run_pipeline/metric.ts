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

import { ExpectExpression, expectExpressionProvider, ExpressionResult } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function({
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
        const expression = `kibana | kibana_context | esaggs index='logstash-*' aggConfigs='[
          {"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},
          {"id":"1","enabled":true,"type":"max","schema":"metric","params":
            {"field":"bytes"}
          },
          {"id":"2","enabled":true,"type":"terms","schema":"segment","params":
            {"field":"response.raw","size":4,"order":"desc","orderBy":"1"}
          }]'`;
        // we execute the part of expression that fetches the data and store its response
        dataContext = await expectExpression('partial_metric_test', expression).getResponse();
      });

      it('with invalid data', async () => {
        const expression = 'metricVis metric={visdimension 0}';
        await (
          await expectExpression('metric_invalid_data', expression).toMatchSnapshot()
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

      it('with percentage option', async () => {
        const expression =
          'metricVis metric={visdimension 0} percentage=true colorRange={range from=0 to=1000}';
        await (
          await expectExpression('metric_percentage', expression, dataContext).toMatchSnapshot()
        ).toMatchScreenshot();
      });
    });
  });
}
