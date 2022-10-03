/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import { ExpectExpression, expectExpressionProvider } from '../helpers';
import { FtrProviderContext } from '../../../../functional/ftr_provider_context';
import { expectedResult } from './fetch_event_annotations_result';

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;

  describe('fetch event annotation tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    it(`manual annotations from different groups`, async () => {
      const expression = `
      kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
      | fetch_event_annotations
        interval="1w" 
        groups={event_annotation_group   dataView={indexPatternLoad id="logstash-*"}  annotations={
          manual_point_event_annotation id="ann1" label="Manual1" color="red" icon="bolt" time="2015-09-21T12:15:00Z" lineWidth="3" lineStyle="solid" textVisibility=true
          } 
          annotations={
            manual_point_event_annotation id="ann2" label="ManualHidden" color="pink" icon="triangle" time="2015-09-21T12:30:00Z" isHidden=true
          }
        }
        groups={event_annotation_group dataView={indexPatternLoad id="logstash-*"} annotations={
          manual_range_event_annotation id="ann3" label="Range" color="blue" time="2015-09-21T07:30:00Z" endTime="2015-09-21T12:30:00Z"
        }
      }
    `;
      const result = await expectExpression('fetch_event_annotations', expression).getResponse();

      expect(result.rows.length).to.equal(2); // filters out hidden annotations
      expect(result.rows).to.eql([
        {
          id: 'ann3',
          time: '2015-09-21T07:30:00Z',
          endTime: '2015-09-21T12:30:00Z',
          timebucket: '2015-09-20T14:30:00.000Z',
          type: 'range',
          label: 'Range',
          color: 'blue',
        },
        {
          id: 'ann1',
          time: '2015-09-21T12:15:00Z',
          timebucket: '2015-09-20T14:30:00.000Z', // time bucket is correctly assigned
          type: 'point',
          label: 'Manual1',
          lineStyle: 'solid', // styles and label are passed
          color: 'red',
          icon: 'bolt',
          lineWidth: 3,
          textVisibility: true,
        },
      ]);
    });

    describe('query and manual annotations', () => {
      it('calculates correct timebuckets, counts skippedCount, passes fields and styles for single group with only query annotations', async () => {
        const expression = `
        kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
        | fetch_event_annotations interval="1d" groups={event_annotation_group  
          dataView={indexPatternLoad id="logstash-*"} 
          annotations={query_point_event_annotation id="server_errors" filter={kql q="response.raw === 503"}  extraFields='response.raw'  extraFields='extension.raw'   extraFields='bytes' timeField="@timestamp" label="503" color="red"}
          annotations={query_point_event_annotation id="client_errors" filter={kql q="response.raw === 404"}  extraFields='response.raw' textField="ip"  timeField="@timestamp" label="404" color="orange"}}
      `;

        const result = await expectExpression('fetch_event_annotations', expression).getResponse();
        expect(result.rows).to.eql(expectedResult);
      });
      it('calculates correct timebuckets, counts skippedCount, passes fields and styles for multiple groups with only query annotations', async () => {
        const expression = `
        kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
        | fetch_event_annotations interval="1d" groups={event_annotation_group  
          dataView={indexPatternLoad id="logstash-*"} 
          annotations={query_point_event_annotation id="server_errors" filter={kql q="response.raw === 503"}  extraFields='response.raw'  extraFields='extension.raw'   extraFields='bytes' timeField="@timestamp" label="503" color="red"}}
          groups={event_annotation_group  
            dataView={indexPatternLoad id="logstash-*"} 
            annotations={query_point_event_annotation id="client_errors" filter={kql q="response.raw === 404"}  extraFields='response.raw'  textField="ip" timeField="@timestamp" label="404" color="orange"}}
      `;

        const result = await expectExpression('fetch_event_annotations', expression).getResponse();
        expect(result.rows).to.eql(expectedResult);
      });
      it('calculates correct timebuckets, counts skippedCount, passes fields and styles for multiple groups with query and manual annotations', async () => {
        const expression = `
        kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
        | fetch_event_annotations interval="1d" groups={event_annotation_group  
          dataView={indexPatternLoad id="logstash-*"} 
          annotations={query_point_event_annotation id="server_errors" filter={kql q="response.raw === 503"}  extraFields='response.raw'  extraFields='extension.raw'   extraFields='bytes' timeField="@timestamp" label="503" color="red"}}
          groups={event_annotation_group  
            dataView={indexPatternLoad id="logstash-*"} 
            annotations={
              manual_point_event_annotation id="ann1" label="Manual1" color="red" icon="bolt" time="2015-09-21T12:15:00Z" lineWidth="3" lineStyle="solid" textVisibility=true
            } 
            annotations={query_point_event_annotation id="client_errors" filter={kql q="response.raw === 404"}  extraFields='response.raw' timeField="@timestamp"  textField="ip" label="404" color="orange"}
            annotations={
              manual_range_event_annotation id="ann3" label="Range" color="blue" time="2015-09-21T07:30:00Z" endTime="2015-09-21T12:30:00Z"
            }}
      `;

        const result = await expectExpression('fetch_event_annotations', expression).getResponse();
        expect(result.rows).to.eql([
          ...expectedResult.slice(0, 19),
          omit(expectedResult[19], 'skippedCount'), // skippedCount is moved to the last row of the timebucket
          {
            color: 'blue',
            endTime: '2015-09-21T12:30:00Z',
            id: 'ann3',
            label: 'Range',
            time: '2015-09-21T07:30:00Z',
            timebucket: '2015-09-20T14:30:00.000Z',
            type: 'range',
          },
          {
            color: 'red',
            icon: 'bolt',
            id: 'ann1',
            label: 'Manual1',
            lineStyle: 'solid',
            lineWidth: 3,
            skippedCount: 269,
            textVisibility: true,
            time: '2015-09-21T12:15:00Z',
            timebucket: '2015-09-20T14:30:00.000Z',
            type: 'point',
          },

          ...expectedResult.slice(-20),
        ]);
      });
    });
  });
}
