/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import { SimpleEmitter } from '../../utils/simple_emitter';

export function VislibLibDispatchProvider(Private, config) {

  /**
   * Handles event responses
   *
   * @class Dispatch
   * @constructor
   * @param handler {Object} Reference to Handler Class Object
   */

  class Dispatch extends SimpleEmitter {
    constructor(handler) {
      super();
      this.handler = handler;
      this._listeners = {};
    }


    _pieClickResponse(data) {
      const points = [];

      let dataPointer = data;
      while (dataPointer && dataPointer.rawData) {
        points.push(dataPointer.rawData);
        dataPointer = dataPointer.parent;
      }

      if (data.rawData.table.$parent) {
        const { table, column, row, key } = data.rawData.table.$parent;
        points.push({ table, column, row, value: key });
      }

      return points;
    }

    _seriesClickResponse(data) {
      const points = [];

      ['xRaw', 'yRaw', 'zRaw', 'seriesRaw', 'rawData', 'tableRaw'].forEach(val => {
        if (data[val]) {
          points.push(data[val]);
        }
      });

      return points;
    }

    /**
     * Response to click  events
     *
     * @param d {Object} Data point
     * @returns event with list of data points related to the click
     */
    clickEventResponse(d) {
      const _data = d3.event.target.nearestViewportElement ?
        d3.event.target.nearestViewportElement.__data__ : d3.event.target.__data__;
      const isSlices = !!(_data && _data.slices);

      const data = d.input || d;

      return {
        e: d3.event,
        data: isSlices ? this._pieClickResponse(data) : this._seriesClickResponse(data),
      };
    }

    /**
     * Response to hover events
     *
     * @param d {Object} Data point
     * @param i {Number} Index number of data point
     * @returns {{value: *, point: *, label: *, color: *, pointIndex: *,
     * series: *, config: *, data: (Object|*),
     * e: (d3.event|*), handler: (Object|*)}} Event response object
     */
    eventResponse(d, i) {
      const datum = d._input || d;
      const data = d3.event.target.nearestViewportElement ?
        d3.event.target.nearestViewportElement.__data__ : d3.event.target.__data__;
      const label = d.label ? d.label : (d.series || 'Count');
      const isSeries = !!(data && data.series);
      const isSlices = !!(data && data.slices);
      const series = isSeries ? data.series : undefined;
      const slices = isSlices ? data.slices : undefined;
      const handler = this.handler;
      const color = _.get(handler, 'data.color');

      const eventData = {
        value: d.y,
        point: datum,
        datum: datum,
        label: label,
        color: color ? color(label) : undefined,
        pointIndex: i,
        series: series,
        slices: slices,
        config: handler && handler.visConfig,
        data: data,
        e: d3.event,
        handler: handler
      };

      return eventData;
    }

    /**
     * Returns a function that adds events and listeners to a D3 selection
     *
     * @method addEvent
     * @param event {String}
     * @param callback {Function}
     * @returns {Function}
     */
    addEvent(event, callback) {
      return function (selection) {
        selection.each(function () {
          const element = d3.select(this);

          if (typeof callback === 'function') {
            return element.on(event, callback);
          }
        });
      };
    }

    /**
     *
     * @method addHoverEvent
     * @returns {Function}
     */
    addHoverEvent() {
      const self = this;
      const isClickable = this.listenerCount('click') > 0;
      const addEvent = this.addEvent;
      const $el = this.handler.el;
      if (!this.handler.highlight) {
        this.handler.highlight = self.highlight;
      }

      function hover(d, i) {
        // Add pointer if item is clickable
        if (isClickable) {
          self.addMousePointer.call(this, arguments);
        }

        self.handler.highlight.call(this, $el);
        self.emit('hover', self.eventResponse(d, i));
      }

      return addEvent('mouseover', hover);
    }

    /**
     *
     * @method addMouseoutEvent
     * @returns {Function}
     */
    addMouseoutEvent() {
      const self = this;
      const addEvent = this.addEvent;
      const $el = this.handler.el;
      if (!this.handler.unHighlight) {
        this.handler.unHighlight = self.unHighlight;
      }

      function mouseout() {
        self.handler.unHighlight.call(this, $el);
      }

      return addEvent('mouseout', mouseout);
    }

    /**
     *
     * @method addClickEvent
     * @returns {Function}
     */
    addClickEvent() {
      const self = this;
      const addEvent = this.addEvent;

      function click(d) {
        self.emit('click', self.clickEventResponse(d));
      }

      return addEvent('click', click);
    }

    /**
     * Determine if we will allow brushing
     *
     * @method allowBrushing
     * @returns {Boolean}
     */
    allowBrushing() {
      const xAxis = this.handler.categoryAxes[0];

      //Allow brushing for ordered axis - date histogram and histogram
      return Boolean(xAxis.ordered);
    }

    /**
     * Determine if brushing is currently enabled
     *
     * @method isBrushable
     * @returns {Boolean}
     */
    isBrushable() {
      return this.allowBrushing() && this.listenerCount('brush') > 0;
    }

    /**
     *
     * @param svg
     * @returns {Function}
     */
    addBrushEvent(svg) {
      if (!this.isBrushable()) return;

      const self = this;
      const xScale = this.handler.categoryAxes[0].getScale();
      const brush = this.createBrush(xScale, svg);

      function simulateClickWithBrushEnabled(d, i) {
        if (!validBrushClick(d3.event)) return;

        if (isQuantitativeScale(xScale)) {
          const bar = d3.select(this);
          const startX = d3.mouse(svg.node());
          const startXInv = xScale.invert(startX[0]);

          // Reset the brush value
          brush.extent([startXInv, startXInv]);

          // Magic!
          // Need to call brush on svg to see brush when brushing
          // while on top of bars.
          // Need to call brush on bar to allow the click event to be registered
          svg.call(brush);
          bar.call(brush);
        } else {
          self.emit('click', self.eventResponse(d, i));
        }
      }

      return this.addEvent('mousedown', simulateClickWithBrushEnabled);
    }

    /**
     * Mouseover Behavior
     *
     * @method addMousePointer
     * @returns {d3.Selection}
     */
    addMousePointer() {
      return d3.select(this).style('cursor', 'pointer');
    }

    /**
     * Highlight the element that is under the cursor
     * by reducing the opacity of all the elements on the graph.
     * @param element {d3.Selection}
     * @method highlight
     */
    highlight(element) {
      const label = this.getAttribute('data-label');
      if (!label) return;

      const dimming = config.get('visualization:dimmingOpacity');
      $(element).parent().find('[data-label]')
        .css('opacity', 1)//Opacity 1 is needed to avoid the css application
        .not((els, el) => String($(el).data('label')) === label)
        .css('opacity', justifyOpacity(dimming));
    }

    /**
     * Mouseout Behavior
     *
     * @param element {d3.Selection}
     * @method unHighlight
     */
    unHighlight(element) {
      $('[data-label]', element.parentNode).css('opacity', 1);
    }

    /**
     * Adds D3 brush to SVG and returns the brush function
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @returns {*} Returns a D3 brush function and a SVG with a brush group attached
     */
    createBrush(xScale, svg) {
      const self = this;
      const visConfig = self.handler.visConfig;
      const { width, height } = svg.node().getBBox();
      const isHorizontal = self.handler.categoryAxes[0].axisConfig.isHorizontal();

      // Brush scale
      const brush = d3.svg.brush();
      if (isHorizontal) {
        brush.x(xScale);
      } else {
        brush.y(xScale);
      }

      brush.on('brushend', function brushEnd() {

        // Assumes data is selected at the chart level
        // In this case, the number of data objects should always be 1
        const data = d3.select(this).data()[0];
        const isTimeSeries = (data.ordered && data.ordered.date);

        // Allows for brushing on d3.scale.ordinal()
        const selected = xScale.domain().filter(function (d) {
          return (brush.extent()[0] <= xScale(d)) && (xScale(d) <= brush.extent()[1]);
        });
        const range = isTimeSeries ? brush.extent() : selected;

        return self.emit('brush', {
          range: range,
          config: visConfig,
          e: d3.event,
          data: data
        });
      });

      // if `addBrushing` is true, add brush canvas
      if (self.listenerCount('brush')) {
        const rect = svg.insert('g', 'g')
          .attr('class', 'brush')
          .call(brush)
          .call(function (brushG) {
            // hijack the brush start event to filter out right/middle clicks
            const brushHandler = brushG.on('mousedown.brush');
            if (!brushHandler) return; // touch events in use
            brushG.on('mousedown.brush', function () {
              if (validBrushClick(d3.event)) brushHandler.apply(this, arguments);
            });
          })
          .selectAll('rect');

        if (isHorizontal) {
          rect.attr('height', height);
        } else {
          rect.attr('width', width);
        }

        return brush;
      }
    }
  }

  /**
   * Determine if d3.Scale is quantitative
   *
   * @param element {d3.Scale}
   * @method isQuantitativeScale
   * @returns {boolean}
   */
  function isQuantitativeScale(scale) {
    //Invert is a method that only exists on quantitative scales
    if (scale.invert) {
      return true;
    } else {
      return false;
    }
  }

  function validBrushClick(event) {
    return event.button === 0;
  }


  function justifyOpacity(opacity) {
    const decimalNumber = parseFloat(opacity, 10);
    const fallbackOpacity = 0.5;
    return (0 <= decimalNumber  && decimalNumber <= 1) ? decimalNumber : fallbackOpacity;
  }

  return Dispatch;
}
