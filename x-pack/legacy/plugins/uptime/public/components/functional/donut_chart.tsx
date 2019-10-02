/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { DonutChartLegend } from './donut_chart_legend';

interface DonutChartProps {
  up: number;
  down: number;
  width: number;
  height: number;
}

export const DonutChart = ({ height, down, up, width }: DonutChartProps) => {
  const chartElement = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (chartElement.current !== null) {
      const svg = d3
        .select(chartElement.current)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
      const data = { up, down };
      const color = d3
        // @ts-ignore this function exists
        .scaleOrdinal()
        .domain(data)
        .range(['#D5DAE4', '#AD392D']);
      // @ts-ignore this function exists
      const pie = d3.pie().value((d: any) => d.value);
      const dataReady = pie(d3.entries(data));
      svg
        .selectAll('key')
        .data(dataReady)
        .enter()
        .append('path')
        .attr(
          'd',
          d3
            // @ts-ignore this function exists
            .arc()
            .innerRadius(width * 0.2)
            .outerRadius(Math.min(width, height) / 2 - 10)
        )
        .attr('fill', (d: any) => color(d.data.key));
    }
  }, [chartElement.current, up, down]);
  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <svg ref={chartElement} width={width} height={height} />
      </EuiFlexItem>
      <EuiFlexItem>
        <DonutChartLegend down={down} up={up} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
