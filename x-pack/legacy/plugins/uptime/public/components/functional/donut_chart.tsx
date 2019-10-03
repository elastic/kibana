/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

console.log(d3);
const WIDTH = 128;
const HEIGHT = 128;

interface DonutChartProps {
  up: number;
  down: number;
}

export const DonutChart = ({ up, down }: DonutChartProps) => {
  const chartElement = useRef<string | null>(null);
  useEffect(() => {
    if (chartElement.current !== null) {
      const svg = d3
        .select(chartElement.current)
        .append('g')
        .attr('transform', `translate(${WIDTH / 2}, ${HEIGHT / 2})`);
      const data = { up, down };
      const color = d3
        .scaleOrdinal()
        .domain(data)
        .range(['#D5DAE4', '#AD392D']);
      const pie = d3.pie().value(d => d.value);
      const dataReady = pie(d3.entries(data));
      svg
        .selectAll('key')
        .data(dataReady)
        .enter()
        .append('path')
        .attr(
          'd',
          d3
            .arc()
            .innerRadius(WIDTH * 0.2)
            .outerRadius(Math.min(WIDTH, HEIGHT) / 2 - 10)
        )
        .attr('fill', function(d) {
          return color(d.data.key);
        });
    }
  }, [chartElement.current, up, down]);
  return (
    <EuiFlexGroup component="span" alignItems="center">
      <EuiFlexItem grow={false}>
        <svg ref={chartElement} width={WIDTH} height={HEIGHT} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiHealth color="#AD392D" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{down}</EuiFlexItem>
              <EuiFlexItem>Down</EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                <EuiHealth color="#D5DAE4" />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>{up}</EuiFlexItem>
              <EuiFlexItem grow={8}>Up</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
