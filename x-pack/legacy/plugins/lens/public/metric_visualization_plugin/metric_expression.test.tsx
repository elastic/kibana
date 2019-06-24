/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricChart, MetricChart } from './metric_expression';
import { KibanaDatatable } from '../types';
import React from 'react';
import { shallow } from 'enzyme';
import { MetricConfig } from './types';

function sampleArgs() {
  const data: KibanaDatatable = {
    type: 'kibana_datatable',
    columns: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }, { id: 'c', name: 'c' }],
    rows: [{ a: 1, b: 2, c: 3 }],
  };

  const args: MetricConfig = {
    title: 'My fanci metric chart',
    accessor: 'a',
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

      expect(shallow(<MetricChart data={data} args={args} />)).toMatchInlineSnapshot(`
<EuiFlexGroup
  alignItems="center"
  className="lnsChart"
  justifyContent="spaceAround"
>
  <EuiFlexItem
    grow={false}
  >
    <div
      style={
        Object {
          "fontSize": "60pt",
          "fontWeight": 600,
          "textAlign": "center",
        }
      }
    >
      1
    </div>
    <EuiText
      textAlign="center"
    >
      My fanci metric chart
    </EuiText>
  </EuiFlexItem>
</EuiFlexGroup>
`);
    });
  });
});
