/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const supertest = getService('supertest');

  describe('lens expressions tests', () => {
    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };
    describe('correctly runs on the server', () => {
      it('runs the provided lens expression on the server', async () => {
        const expression = `
        kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
        | lens_merge_tables layerIds=\"myLayerId\"
            tables={
                esaggs index={indexPatternLoad id=\"logstash-*\"} 
                aggs={aggDateHistogram id=\"0\" enabled=true schema=\"segment\" field=\"@timestamp\" useNormalizedEsInterval=true interval="1h" drop_partials=false min_doc_count=0 extended_bounds=\"{}\"}
                aggs={aggMax id=\"1\" enabled=true schema=\"metric\" field=\"bytes\"} 
                metricsAtAllLevels=false partialRows=false timeFields=\"@timestamp\"
                | lens_rename_columns 
                    idMap=\"{\\\"col-0-0\\\":{\\\"label\\\":\\\"@timestamp\\\",\\\"dataType\\\":\\\"date\\\",\\\"operationType\\\":\\\"date_histogram\\\",\\\"sourceField\\\":\\\"@timestamp\\\",\\\"isBucketed\\\":true,\\\"scale\\\":\\\"interval\\\",\\\"params\\\":{\\\"interval\\\":\\\"1h\\\"},\\\"id\\\":\\\"timeColumnId\\\"},\\\"col-1-1\\\":{\\\"label\\\":\\\"Maximum of bytes\\\",\\\"dataType\\\":\\\"number\\\",\\\"operationType\\\":\\\"max\\\",\\\"sourceField\\\":\\\"bytes\\\",\\\"isBucketed\\\":false,\\\"scale\\\":\\\"ratio\\\",\\\"id\\\":\\\"maxColumnId\\\"}}\"
                | lens_counter_rate  inputColumnId=\"maxColumnId\" outputColumnId=\"counterRateColumnId\"
                    outputColumnName=\"Counter rate of bytes per second\"
                | lens_time_scale dateColumnId=\"timeColumnId\" inputColumnId=\"counterRateColumnId\"
                    outputColumnId=\"counterRateColumnId\" outputColumnName=\"Counter rate of bytes per second\" targetUnit=\"s\"
                | lens_format_column format=\"\" columnId=\"counterRateColumnId\"
                    parentFormat=\"{\\\"id\\\":\\\"suffix\\\",\\\"params\\\":{\\\"unit\\\":\\\"s\\\"}}\"
            }
            `;

        await supertest
          .post('/api/interpreter_functional/run_expression')
          .set('kbn-xsrf', 'anything')
          .send({ expression, input: undefined })
          .expect(200)
          .expect(({ body }) => {
            // Check if it's a Lens table
            expect(body.type).to.be('lens_multitable');
            expect(Object.keys(body.tables)[0]).to.be('myLayerId');
            expect(body.tables.myLayerId.type).to.be('datatable');
            // Check column rename
            expect(body.tables.myLayerId.columns[0].id).to.be('timeColumnId');
            expect(body.tables.myLayerId.columns[0].meta.sourceParams.type).to.be('date_histogram');
            expect(body.tables.myLayerId.columns[1].id).to.be('maxColumnId');
            expect(body.tables.myLayerId.columns[2].id).to.be('counterRateColumnId');
            // Check for time scale + column format
            expect(body.tables.myLayerId.columns[2].meta.params.id).to.be('suffix');
            expect(body.tables.myLayerId.columns[2].meta.params.params.unit).to.be('s');
          });
      });
    });
  });
}
