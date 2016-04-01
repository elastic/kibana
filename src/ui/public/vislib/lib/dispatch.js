define(function (require) {
  return function DispatchClass(Private) {
    let d3 = require('d3');
    let _ = require('lodash');
    let $ = require('jquery');
    let Tooltip = Private(require('ui/vislib/components/Tooltip'));
    let SimpleEmitter = require('ui/utils/SimpleEmitter');

    /**
     * Handles event responses
     *
     * @class Dispatch
     * @constructor
     * @param handler {Object} Reference to Handler Class Object
     */

    _.class(Dispatch).inherits(SimpleEmitter);
    function Dispatch(handler) {
      if (!(this instanceof Dispatch)) {
        return new Dispatch(handler);
      }

      Dispatch.Super.call(this);
      this.handler = handler;
      this._listeners = {};
    }

    /**
     * Response to click and hover events
     *
     * @param d {Object} Data point
     * @param i {Number} Index number of data point
     * @returns {{value: *, point: *, label: *, color: *, pointIndex: *,
      * series: *, config: *, data: (Object|*),
     * e: (d3.event|*), handler: (Object|*)}} Event response object
     */
    Dispatch.prototype.eventResponse = function (d, i) {
      let datum = d._input || d;
      let data = d3.event.target.nearestViewportElement ?
        d3.event.target.nearestViewportElement.__data__ : d3.event.target.__data__;
      let label = d.label ? d.label : d.name;
      let isSeries = !!(data && data.series);
      let isSlices = !!(data && data.slices);
      let series = isSeries ? data.series : undefined;
      let slices = isSlices ? data.slices : undefined;
      let handler = this.handler;
      let color = _.get(handler, 'data.color');
      let isPercentage = (handler && handler._attr.mode === 'percentage');

      let eventData = {
        value: d.y,
        point: datum,
        datum: datum,
        label: label,
        color: color ? color(label) : undefined,
        pointIndex: i,
        series: series,
        slices: slices,
        config: handler && handler._attr,
        data: data,
        e: d3.event,
        handler: handler
      };

      if (isSeries) {
        // Find object with the actual d value and add it to the point object
        let object = _.find(series, { 'label': d.label });
        eventData.value = +object.values[i].y;

        if (isPercentage) {
          // Add the formatted percentage to the point object
          eventData.percent = (100 * d.y).toFixed(1) + '%';
        }
      }

      return eventData;
    };

    /**
     * Returns a function that adds events and listeners to a D3 selection
     *
     * @method addEvent
     * @param event {String}
     * @param callback {Function}
     * @returns {Function}
     */
    Dispatch.prototype.addEvent = function (event, callback) {
      return function (selection) {
        selection.each(function () {
          let element = d3.select(this);

          if (typeof callback === 'function') {
            return element.on(event, callback);
          }
        });
      };
    };

    /**
     *
     * @method addHoverEvent
     * @returns {Function}
     */
    Dispatch.prototype.addHoverEvent = function () {
      let self = this;
      let isClickable = this.listenerCount('click') > 0;
      let addEvent = this.addEvent;
      let $el = this.handler.el;
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
    };

    /**
     *
     * @method addMouseoutEvent
     * @returns {Function}
     */
    Dispatch.prototype.addMouseoutEvent = function () {
      let self = this;
      let addEvent = this.addEvent;
      let $el = this.handler.el;
      if (!this.handler.unHighlight) {
        this.handler.unHighlight = self.unHighlight;
      }

      function mouseout() {
        self.handler.unHighlight.call(this, $el);
      }

      return addEvent('mouseout', mouseout);
    };

    /**
     *
     * @method addClickEvent
     * @returns {Function}
     */
    Dispatch.prototype.addClickEvent = function () {
      let self = this;
      let addEvent = this.addEvent;

      function click(d, i) {
        self.emit('click', self.eventResponse(d, i));
      }

      return addEvent('click', click);
    };

    /**
     * Determine if we will allow brushing
     *
     * @method allowBrushing
     * @returns {Boolean}
     */
    Dispatch.prototype.allowBrushing = function () {
      let xAxis = this.handler.xAxis;
      // Don't allow brushing for time based charts from non-time-based indices
      let hasTimeField = this.handler.vis._attr.hasTimeField;

      return Boolean(hasTimeField && xAxis.ordered && xAxis.xScale && _.isFunction(xAxis.xScale.invert));
    };

    /**
     * Determine if brushing is currently enabled
     *
     * @method isBrushable
     * @returns {Boolean}
     */
    Dispatch.prototype.isBrushable = function () {
      return this.allowBrushing() && this.listenerCount('brush') > 0;
    };

    /**
     *
     * @param svg
     * @returns {Function}
     */
    Dispatch.prototype.addBrushEvent = function (svg) {
      if (!this.isBrushable()) return;

      let xScale = this.handler.xAxis.xScale;
      let yScale = this.handler.xAxis.yScale;
      let brush = this.createBrush(xScale, svg);

      function brushEnd() {
        if (!validBrushClick(d3.event)) return;

        let bar = d3.select(this);
        let startX = d3.mouse(svg.node());
        let startXInv = xScale.invert(startX[0]);

        // Reset the brush value
        brush.extent([startXInv, startXInv]);

        // Magic!
        // Need to call brush on svg to see brush when brushing
        // while on top of bars.
        // Need to call brush on bar to allow the click event to be registered
        svg.call(brush);
        bar.call(brush);
      }

      return this.addEvent('mousedown', brushEnd);
    };


    /**
     * Mouseover Behavior
     *
     * @method addMousePointer
     * @returns {D3.Selection}
     */
    Dispatch.prototype.addMousePointer = function () {
      return d3.select(this).style('cursor', 'pointer');
    };

    /**
     * Mouseover Behavior
     *
     * @param element {D3.Selection}
     * @method highlight
     */
    Dispatch.prototype.highlight = function (element) {
      let label = this.getAttribute('data-label');
      if (!label) return;
      //Opacity 1 is needed to avoid the css application
      $('[data-label]', element.parentNode).css('opacity', 1).not(
        function (els, el) {
          return `${$(el).data('label')}` === label;
        }
      ).css('opacity', 0.5);
    };

    /**
     * Mouseout Behavior
     *
     * @param element {D3.Selection}
     * @method unHighlight
     */
    Dispatch.prototype.unHighlight = function (element) {
      $('[data-label]', element.parentNode).css('opacity', 1);
    };

    /**
     * Adds D3 brush to SVG and returns the brush function
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @returns {*} Returns a D3 brush function and a SVG with a brush group attached
     */
    Dispatch.prototype.createBrush = function (xScale, svg) {
      let self = this;
      let attr = self.handler._attr;
      let height = attr.height;
      let margin = attr.margin;

      // Brush scale
      let brush = d3.svg.brush()
      .x(xScale)
      .on('brushend', function brushEnd() {

        // Assumes data is selected at the chart level
        // In this case, the number of data objects should always be 1
        let data = d3.select(this).data()[0];
        let isTimeSeries = (data.ordered && data.ordered.date);

        // Allows for brushing on d3.scale.ordinal()
        let selected = xScale.domain().filter(function (d) {
          return (brush.extent()[0] <= xScale(d)) && (xScale(d) <= brush.extent()[1]);
        });
        let range = isTimeSeries ? brush.extent() : selected;

        return self.emit('brush', {
          range: range,
          config: attr,
          e: d3.event,
          data: data
        });
      });

      // if `addBrushing` is true, add brush canvas
      if (self.listenerCount('brush')) {
        svg.insert('g', 'g')
        .attr('class', 'brush')
        .call(brush)
        .call(function (brushG) {
          // hijack the brush start event to filter out right/middle clicks
          let brushHandler = brushG.on('mousedown.brush');
          if (!brushHandler) return; // touch events in use
          brushG.on('mousedown.brush', function () {
            if (validBrushClick(d3.event)) brushHandler.apply(this, arguments);
          });
        })
        .selectAll('rect')
        .attr('height', height - margin.top - margin.bottom);

        return brush;
      }
    };

    function validBrushClick(event) {
      return event.button === 0;
    }


    return Dispatch;
  };
});
