/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';
import d3 from 'd3';

interface ColorRangeLegendProps {
  cellBgColor: (d: number) => string;
}

export const ColorRangeLegend: FC<ColorRangeLegendProps> = ({ cellBgColor }) => {
  // use a range of 11 to get values from 0 to 10
  const scaleMl = d3.range(11).map(d => cellBgColor(d / 10));

  useEffect(() => {
    // add the legend now
    const legendFullHeight = 40;
    const legendFullWidth = 400;

    const legendMargin = { top: 0, bottom: 20, left: 20, right: 20 };

    // use same margins as main plot
    const legendWidth = legendFullWidth - legendMargin.left - legendMargin.right;
    const legendHeight = legendFullHeight - legendMargin.top - legendMargin.bottom;

    d3.select('#ml-legend-svg')
      .selectAll('*')
      .remove();

    const legendSvg = d3
      .select('#ml-legend-svg')
      .attr('width', legendFullWidth)
      .attr('height', legendFullHeight)
      .append('g')
      .attr('transform', 'translate(' + legendMargin.left + ',' + legendMargin.top + ')');

    updateColourScale(scaleMl);

    // update the colour scale, restyle the plot points and legend
    function updateColourScale(scale: string[]) {
      // clear current legend
      legendSvg.selectAll('*').remove();

      // append gradient bar
      const gradient = legendSvg
        .append('defs')
        .append('linearGradient')
        .attr('id', 'mlGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%')
        .attr('spreadMethod', 'pad');

      // programatically generate the gradient for the legend
      // this creates an array of [pct, colour] pairs as stop
      // values for legend
      const pct = linspace(0, 100, scale.length).map(function(d) {
        return Math.round(d) + '%';
      });

      const colourPct = d3.zip(pct, scale);

      colourPct.forEach(function(d) {
        gradient
          .append('stop')
          .attr('offset', d[0])
          .attr('stop-color', d[1])
          .attr('stop-opacity', 1);
      });

      legendSvg
        .append('rect')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#mlGradient)');

      // create a scale and axis for the legend
      const legendScale = d3.scale
        .linear()
        .domain([0, 1])
        .range([0, legendWidth]);

      const legendAxis = d3.svg
        .axis()
        .scale(legendScale)
        .orient('bottom');
      // .tickValues(d3.range(0, 2));
      // .tickFormat(d3.format('d'));

      legendSvg
        .append('g')
        .attr('class', 'legend axis')
        .attr('transform', 'translate(0, ' + legendHeight + ')')
        .call(legendAxis);
    }

    function linspace(start: number, end: number, n: number) {
      const out = [];
      const delta = (end - start) / (n - 1);

      let i = 0;
      while (i < n - 1) {
        out.push(start + i * delta);
        i++;
      }

      out.push(end);
      return out;
    }
  }, [scaleMl]);

  return (
    <div id="mlColorRangeLegend">
      <svg id="ml-legend-svg" />
    </div>
  );
};
