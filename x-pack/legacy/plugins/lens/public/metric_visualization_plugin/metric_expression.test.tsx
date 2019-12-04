/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricChart, MetricChart } from './metric_expression';
import { LensMultiTable } from '../types';
import React from 'react';
import { shallow } from 'enzyme';
import { MetricConfig } from './types';
import { FieldFormat } from '../../../../../../src/plugins/data/public';

function sampleArgs() {
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      l1: {
        type: 'kibana_datatable',
        columns: [
          { id: 'a', name: 'a' },
          { id: 'b', name: 'b' },
          { id: 'c', name: 'c' },
        ],
        rows: [{ a: 10110, b: 2, c: 3 }],
      },
    },
  };

  const args: MetricConfig = {
    accessor: 'a',
    layerId: 'l1',
    title: 'My fanci metric chart',
    mode: 'full',
  };

  return { data, args };
}

describe('metric_expression', () => {
  describe('metricChart', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();

      expect(metricChart.fn(data, args, {})).toEqual({
        type: 'render',
        as: 'lens_metric_chart_renderer',
        value: { data, args },
      });
    });
  });

  describe('MetricChart component', () => {
    test('it renders the title and value', () => {
      const { data, args } = sampleArgs();

      expect(shallow(<MetricChart data={data} args={args} formatFactory={x => x as FieldFormat} />))
        .toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportTitle="My fanci metric chart"
        >
          <AutoScale>
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              10110
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it does not render title in reduced mode', () => {
      const { data, args } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={data}
            args={{ ...args, mode: 'reduced' }}
            formatFactory={x => x as FieldFormat}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportTitle="My fanci metric chart"
        >
          <AutoScale>
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              10110
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });
  });
});
