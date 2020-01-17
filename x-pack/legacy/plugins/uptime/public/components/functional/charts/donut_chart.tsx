/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useContext, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { i18n } from '@kbn/i18n';
import { DonutChartLegend } from './donut_chart_legend';
import { UptimeThemeContext } from '../../../contexts';

interface DonutChartProps {
  down: number;
  height: number;
  up: number;
  width: number;
}

export const DonutChart = ({ height, down, up, width }: DonutChartProps) => {
  const chartElement = useRef<SVGSVGElement | null>(null);

  const {
    colors: { danger, gray },
  } = useContext(UptimeThemeContext);

  let upCount = up;
  if (up === 0 && down === 0) {
    upCount = 1;
  }
  useEffect(() => {
    if (chartElement.current !== null) {
      // we must remove any existing paths before painting
      d3.selectAll('g').remove();
      const svgElement = d3
        .select(chartElement.current)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
      const color = d3.scale
        .ordinal()
        .domain(['up', 'down'])
        .range([gray, danger]);
      const pieGenerator = d3.layout
        .pie()
        .value(({ value }: any) => value)
        // these start/end angles will reverse the direction of the pie,
        // which matches our design
        .startAngle(2 * Math.PI)
        .endAngle(0);

      svgElement
        .selectAll('g')
        .data(
          // @ts-ignore pie generator expects param of type number[], but only works with
          // output of d3.entries, which is like Array<{ key: string, value: number }>
          pieGenerator(d3.entries({ up: upCount, down }))
        )
        .enter()
        .append('path')
        .attr(
          'd',
          // @ts-ignore attr does not expect a param of type Arc<Arc> but it behaves as desired
          d3.svg
            .arc()
            .innerRadius(width * 0.28)
            .outerRadius(Math.min(width, height) / 2 - 10)
        )
        .attr('fill', (d: any) => color(d.data.key));
    }
  }, [danger, down, gray, height, upCount, width]);
  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <svg
          aria-label={i18n.translate('xpack.uptime.snapshot.donutChart.ariaLabel', {
            defaultMessage:
              'Pie chart showing the current status. {down} of {total} monitors are down.',
            values: { down, total: up + down },
          })}
          ref={chartElement}
          width={width}
          height={height}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <DonutChartLegend down={down} up={up} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
