/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import d3 from 'd3';

export function calculateTextWidth(txt: string | number, isNumber: boolean) {
  txt = isNumber && typeof txt === 'number' ? d3.format(',')(txt) : txt;

  // Create a temporary selection to append the label to.
  // Note styling of font will be inherited from CSS of page.
  const $body = d3.select('body');
  const $el = $body.append('div');
  const svg = $el.append('svg');

  const tempLabelText = svg
    .append('g')
    .attr('class', 'temp-axis-label tick')
    .selectAll('text.temp.axis')
    .data(['a'])
    .enter()
    .append('text')
    .text(txt);
  const width = (tempLabelText[0][0] as SVGSVGElement).getBBox().width;

  d3.select('.temp-axis-label').remove();
  if ($el !== undefined) {
    $el.remove();
  }
  return Math.ceil(width);
}
