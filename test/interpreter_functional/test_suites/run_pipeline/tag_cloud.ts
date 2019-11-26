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
  describe('tag cloud pipeline expression tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    describe('correctly renders tagcloud', () => {
      let dataContext: ExpressionResult;
      before(async () => {
        const expression = `kibana | kibana_context | esaggs index='logstash-*' aggConfigs='[
          {"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},
          {"id":"2","enabled":true,"type":"terms","schema":"segment","params":
            {"field":"response.raw","size":4,"order":"desc","orderBy":"1"}
          }]'`;
        // we execute the part of expression that fetches the data and store its response
        dataContext = await expectExpression('partial_tagcloud_test', expression).getResponse();
      });

      it('with invalid data', async () => {
        const expression = 'tagcloud metric={visdimension 0}';
        await (
          await expectExpression('tagcloud_invalid_data', expression).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with just metric data', async () => {
        const expression = 'tagcloud metric={visdimension 0}';
        await (
          await expectExpression('tagcloud_metric_data', expression, dataContext).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with metric and bucket data', async () => {
        const expression = 'tagcloud metric={visdimension 0} bucket={visdimension 1}';
        await (
          await expectExpression('tagcloud_all_data', expression, dataContext).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with font size options', async () => {
        const expression =
          'tagcloud metric={visdimension 0} bucket={visdimension 1} minFontSize=20 maxFontSize=40';
        await (
          await expectExpression('tagcloud_fontsize', expression, dataContext).toMatchSnapshot()
        ).toMatchScreenshot();
      });

      it('with scale and orientation options', async () => {
        const expression =
          'tagcloud metric={visdimension 0} bucket={visdimension 1} scale="log" orientation="multiple"';
        await (
          await expectExpression('tagcloud_options', expression, dataContext).toMatchSnapshot()
        ).toMatchScreenshot();
      });
    });
  });
}
