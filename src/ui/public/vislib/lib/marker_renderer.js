define(function (require) {
  var d3 = require('d3');
  var _ = require('lodash');

  /**
   * Renders time markers of the current or specified times.
   *
   * @param selection {Object} d3 selection object
   * @param xScale {Function} d3.time.scale
   * @param height {number} height of the target chart
   * @param [times] {Array[number]|Array[Object]} list of UNIX timestamps (millisecond) or
   *  d3 data series that have time properties.
   * @return {Array[Object]} list of d3 data series.
   */
  function renderWith(opts, selection, xScale, height, times) {
    times = (times && times.length) ? times : [new Date().getTime()];
    times = times.map(function (time) {
      if (_.isUndefined(time.time)) {
        time = { time: time };
      }
      return _.assign({}, opts, time);
    });

    selection.each(function () {
      var layer = d3.select(this).selectAll('.' + opts.layer);

      if (layer.empty()) {
        layer = d3.select(this).append('g')
        .attr('class', opts.layer);
      }

      var markers = layer.selectAll('.' + opts.class)
        .data(times);
      markers
        .enter().append('line')
        .attr('pointer-events', 'none');
      markers
        .attr('class', function (d) {
          return d.class;
        })
        .attr('stroke-width', function (d) {
          return d.width;
        })
        .attr('stroke-opacity', function (d) {
          return d.opacity;
        })
        .attr('stroke', function (d) {
          return d.color;
        })
        .attr('x1', function (d) {
          return xScale(d.time);
        })
        .attr('x2', function (d) {
          return xScale(d.time);
        })
        .attr('y1', height)
        .attr('y2', xScale.range()[0]);
    });

    return times;
  }

  /**
   * Customizes renderer based on parent option and returns a new one.
   *
   * @param [opts] {Object} option object.
   *  Here is default option.
   *    {
   *      'class': 'time-marker',
   *      'layer': 'time-marker-layer',
   *      'color': '#aaa',
   *      'opacity': 0.8,
   *      'width': 1
   *    }
   * @return {Object} configured renderer
   */
  function configureWith(baseOpts, opts) {
    var newOpts = _.assign({}, baseOpts, opts || {});

    return {
      render: (function _render(newOpts) {
        return function render(selection, xScale, height, times) {
          return renderWith(newOpts, selection, xScale, height, times);
        };
      }(newOpts)),
      configure: (function _configure(newOpts) {
        return function configure(opts) {
          return configureWith(newOpts, opts);
        };
      }(newOpts)),
      opts: newOpts
    };
  }

  return configureWith({
    'class': 'time-marker',
    'layer': 'time-marker-layer',
    'color': '#aaa',
    'opacity': 0.8,
    'width': 1
  });
});
