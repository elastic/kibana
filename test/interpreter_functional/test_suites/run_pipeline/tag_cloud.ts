/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpectExpression, expectExpressionProvider, ExpressionResult } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;
  describe('tag cloud pipeline expression tests', () => {
    let dataContext: ExpressionResult;
    before(async () => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });

      const expression = `kibana | kibana_context | esaggs index={indexPatternLoad id='logstash-*'}
        aggs={aggCount id="1" enabled=true schema="metric"}
        aggs={aggTerms id="2" enabled=true schema="segment" field="response.raw" size=4 order="desc" orderBy="1"}`;
      // we execute the part of expression that fetches the data and store its response
      dataContext = await expectExpression('partial_tagcloud_test', expression).getResponse();
    });

    describe('correctly renders tagcloud', () => {
      it('with empty data', async () => {
        const expression = 'tagcloud metric={visdimension 0}';
        await (
          await expectExpression('tagcloud_empty_data', expression, {
            ...dataContext,
            rows: [],
          }).toMatchSnapshot()
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

    describe('throws error at tagcloud', () => {
      it('with invalid data', async () => {
        const expression = 'tagcloud metric={visdimension 0}';
        await (
          await expectExpression('tagcloud_invalid_data', expression).toMatchSnapshot()
        ).toMatchScreenshot();
      });
    });
  });
}
