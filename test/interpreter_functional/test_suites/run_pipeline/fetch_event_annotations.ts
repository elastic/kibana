/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import { ExpectExpression, expectExpressionProvider } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;

  const serverErrorsAnnotationProps = {
    id: 'server_errors',
    type: 'point',
    color: 'red',
    'field:bytes': 0,
    'field:response.raw': '503',
    label: '503',
    'field:extension.raw': 'jpg',
  };
  const clientErrorsAnnotationProps = {
    color: 'orange',
    'field:response.raw': '404',
    id: 'client_errors',
    label: '404',
    type: 'point',
  };

  const expectedResult = [
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T00:00:00.000Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T00:58:25.823Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T00:59:00.367Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T01:55:32.632Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T02:45:59.636Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      'field:response.raw': '200',
      time: '2015-09-21T02:54:47.500Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      'field:extension.raw': 'gif',
      time: '2015-09-21T03:17:30.141Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      'field:extension.raw': 'png',
      time: '2015-09-21T03:26:55.232Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T03:46:06.209Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T04:17:57.312Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T04:19:58.195Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T04:26:43.432Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T05:07:31.817Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T05:12:59.470Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      'field:extension.raw': 'gif',
      time: '2015-09-21T05:34:13.304Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T05:36:00.717Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T06:48:38.946Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      'field:extension.raw': 'php',
      time: '2015-09-21T06:57:46.610Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T06:58:27.922Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      skippedCount: 269,
      time: '2015-09-21T07:11:00.754Z',
      timebucket: '2015-09-20T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:30:35.524Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T14:35:33.669Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      'field:extension.raw': 'gif',
      time: '2015-09-21T14:35:49.990Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:37:30.895Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:37:55.120Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:38:21.637Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T14:38:58.747Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:39:45.330Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:41:08.984Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:46:57.158Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:47:29.295Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      'field:extension.raw': 'css',
      time: '2015-09-21T14:51:33.395Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:51:40.391Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...clientErrorsAnnotationProps,
      time: '2015-09-21T14:57:25.160Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T15:15:42.547Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      'field:extension.raw': 'png',
      time: '2015-09-21T15:22:45.564Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T15:25:05.797Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T15:47:55.678Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      time: '2015-09-21T15:49:56.270Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
    {
      ...serverErrorsAnnotationProps,
      skippedCount: 72,
      time: '2015-09-21T15:54:46.498Z',
      timebucket: '2015-09-21T14:30:00.000Z',
    },
  ];

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
      | fetch_event_annotations timezone="Australia/Darwin"
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
        | fetch_event_annotations interval="1d" timezone="Australia/Darwin" groups={event_annotation_group  
          dataView={indexPatternLoad id="logstash-*"} 
          annotations={query_event_annotation id="server_errors" filter={kql q="response.raw === 503"}  fields='response.raw'  fields='extension.raw'   fields='bytes' timeField="@timestamp" label="503" color="red"}
          annotations={query_event_annotation id="client_errors" filter={kql q="response.raw === 404"}  fields='response.raw'  timeField="@timestamp" label="404" color="orange"}}
      `;

        const result = await expectExpression('fetch_event_annotations', expression).getResponse();
        expect(result.rows).to.eql(expectedResult);
      });
      it('calculates correct timebuckets, counts skippedCount, passes fields and styles for multiple groups with only query annotations', async () => {
        const expression = `
        kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
        | fetch_event_annotations interval="1d" timezone="Australia/Darwin" groups={event_annotation_group  
          dataView={indexPatternLoad id="logstash-*"} 
          annotations={query_event_annotation id="server_errors" filter={kql q="response.raw === 503"}  fields='response.raw'  fields='extension.raw'   fields='bytes' timeField="@timestamp" label="503" color="red"}}
          groups={event_annotation_group  
            dataView={indexPatternLoad id="logstash-*"} 
            annotations={query_event_annotation id="client_errors" filter={kql q="response.raw === 404"}  fields='response.raw'  timeField="@timestamp" label="404" color="orange"}}
      `;

        const result = await expectExpression('fetch_event_annotations', expression).getResponse();
        expect(result.rows).to.eql(expectedResult);
      });
      it('calculates correct timebuckets, counts skippedCount, passes fields and styles for multiple groups with query and manual annotations', async () => {
        const expression = `
        kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
        | fetch_event_annotations interval="1d" timezone="Australia/Darwin" groups={event_annotation_group  
          dataView={indexPatternLoad id="logstash-*"} 
          annotations={query_event_annotation id="server_errors" filter={kql q="response.raw === 503"}  fields='response.raw'  fields='extension.raw'   fields='bytes' timeField="@timestamp" label="503" color="red"}}
          groups={event_annotation_group  
            dataView={indexPatternLoad id="logstash-*"} 
            annotations={
              manual_point_event_annotation id="ann1" label="Manual1" color="red" icon="bolt" time="2015-09-21T12:15:00Z" lineWidth="3" lineStyle="solid" textVisibility=true
            } 
            annotations={query_event_annotation id="client_errors" filter={kql q="response.raw === 404"}  fields='response.raw'  timeField="@timestamp" label="404" color="orange"}
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
