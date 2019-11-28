/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { min, max, map, flatten } from 'lodash';

/*
 * The MIT License
Copyright (c) 2010, 2011, 2012, 2013 by Juergen Marsch
Copyright (c) 2015 by Alexander Wunschik
Copyright (c) 2015 by Stefan Siegl
Copyright (c) 2015 by Pascal Vervest
Copyright (c) 2017 by Rashid Khan
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

The below is based on the flot bubble plugin, but with all the complex overlay logic stripped

*/

const pluginName = 'simpleBubble';
const pluginVersion = '0.1.0';

const options = {
  series: {
    bubbles: {
      size: {
        max: 20,
        min: 2,
      },
      active: true,
      show: true,
      fill: false,
      drawbubble: drawbubbleDefault,
    },
  },
};

function drawbubbleDefault(ctx, series, x, y, radius, c) {
  ctx.fillStyle = c;
  if (series.bubbles.fill) {
    ctx.globalAlpha = series.bubbles.fill;
  }
  ctx.strokeStyle = c;

  ctx.lineWidth = Math.round(radius / 3);
  ctx.beginPath();

  ctx.arc(x, y, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  if (series.bubbles.fill) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

function init(plot) {
  plot.hooks.processOptions.push(processOptions);

  function processOptions(plot, options) {
    if (options.series.bubbles.active) {
      plot.hooks.drawSeries.push(drawSeries);
    }
  }

  function drawSeries(plot, ctx, series) {
    // Actually need to calculate the min/max for the entire set up here, not on an individual series basis;
    const allSizes = map(map(flatten(map(plot.getData(), 'data')), 2), 'size');
    const minPoint = min(allSizes);
    const maxPoint = max(allSizes);

    if (series.bubbles.show) {
      const offset = plot.getPlotOffset();

      function drawPoint(point) {
        const x = offset.left + series.xaxis.p2c(point[0]);
        const y = offset.top + series.yaxis.p2c(point[1]);
        const size = point[2].size;

        const delta = maxPoint - minPoint;
        const radius = (function() {
          if (size == null) {
            return 0;
          } // If there is no size, draw nothing
          if (delta === 0) {
            return series.bubbles.size.min;
          } // If there is no difference between the min and the max, draw the minimum bubble.

          // Otherwise draw something between the min and max acceptable radius.
          return (
            ((series.bubbles.size.max - series.bubbles.size.min) / delta) * (size - minPoint) +
            series.bubbles.size.min
          );
        })();

        const color = series.color === 'function' ? series.color.apply(this, point) : series.color;

        const seriesBubbleDrawFn = series.bubbles.drawbubble;
        seriesBubbleDrawFn(ctx, series, x, y, radius, color);
      }

      series.data.forEach(point => drawPoint(point));
    }
  }
}

export const size = {
  init: init,
  options: options,
  name: pluginName,
  version: pluginVersion,
};
