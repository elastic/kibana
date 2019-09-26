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
export default function({ getPageObjects }: FtrProviderContext) {
  const { visualBuilder, visualize } = getPageObjects(['visualBuilder', 'visualize']);

  describe('visual builder', function describeIndexTests() {
    describe('table', () => {
      beforeEach(async () => {
        await visualBuilder.resetPage('2015-09-22 06:00:00.000', '2015-09-22 11:00:00.000');
        await visualBuilder.clickTable();

        await visualBuilder.checkTableTabIsPresent();
        await visualBuilder.selectGroupByField('machine.os.raw');
        await visualBuilder.setColumnLabelValue('OS');
        await visualize.waitForVisualizationRenderingStabilized();
      });

      it('should display correct values on changing group by field and column name', async () => {
        const EXPECTED = 'OS Count\nwin 8 13\nwin xp 10\nwin 7 12\nios 5\nosx 3';

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display correct values on changing metrics aggregation', async () => {
        const EXPECTED = 'OS Cardinality\nwin 8 12\nwin xp 9\nwin 7 8\nios 5\nosx 3';

        await visualBuilder.setLabel('Cardinality');
        await visualBuilder.selectAggType('Cardinality');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });
    });
  });
}
