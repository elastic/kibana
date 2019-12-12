/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, FC } from 'react';
import d3 from 'd3';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

const COLOR_RANGE_RESOLUTION = 10;

interface ColorRangeLegendProps {
  colorRange: (d: number) => string;
  title?: string;
  width?: number;
}

/**
 * Component to render a legend for color ranges to be used for color coding
 * table cells and visualizations.
 *
 * @param props ColorRangeLegendProps
 */
export const ColorRangeLegend: FC<ColorRangeLegendProps> = ({ colorRange, title, width = 250 }) => {
  const d3Container = useRef<null | SVGSVGElement>(null);

  const scale = d3.range(COLOR_RANGE_RESOLUTION + 1).map(d => ({
    offset: (d / COLOR_RANGE_RESOLUTION) * 100,
    stopColor: colorRange(d / COLOR_RANGE_RESOLUTION),
  }));

  useEffect(() => {
    if (d3Container.current === null) {
      return;
    }

    const wrapperHeight = 32;
    const wrapperWidth = width;

    const margin = { top: 2, bottom: 20, left: 1, right: 1 };

    const legendWidth = wrapperWidth - margin.left - margin.right;
    const legendHeight = wrapperHeight - margin.top - margin.bottom;

    // remove, then redraw the legend
    d3.select(d3Container.current)
      .selectAll('*')
      .remove();

    const wrapper = d3
      .select(d3Container.current)
      .classed('mlColorRangeLegend', true)
      .attr('width', wrapperWidth)
      .attr('height', wrapperHeight)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // append gradient bar
    const gradient = wrapper
      .append('defs')
      .append('linearGradient')
      .attr('id', 'mlColorRangeGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')
      .attr('spreadMethod', 'pad');

    scale.forEach(function(d) {
      gradient
        .append('stop')
        .attr('offset', `${d.offset}%`)
        .attr('stop-color', d.stopColor)
        .attr('stop-opacity', 1);
    });

    wrapper
      .append('rect')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#mlColorRangeGradient)');

    // create a scale and axis for the legend
    const legendScale = d3.scale
      .linear()
      .domain([0, 1])
      .range([0, legendWidth]);

    const legendAxis = d3.svg
      .axis()
      .scale(legendScale)
      .orient('bottom')
      .tickSize(legendHeight + 4)
      .ticks(legendWidth / 40);

    wrapper
      .append('g')
      .attr('class', 'legend axis')
      .attr('transform', 'translate(0, 0)')
      .call(legendAxis);

    // Adjust the alignment of the first and last tick text
    // so that the tick labels don't overflow the color range.
    const text = wrapper.selectAll('text')[0];
    if (text.length > 1) {
      d3.select(text[0]).style('text-anchor', 'start');
      d3.select(text[text.length - 1]).style('text-anchor', 'end');
    }
  }, [JSON.stringify(scale), d3Container.current]);

  if (title === undefined) {
    return <svg ref={d3Container} />;
  }

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiText size="xs">
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <svg ref={d3Container} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
