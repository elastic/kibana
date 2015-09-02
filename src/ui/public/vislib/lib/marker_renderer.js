define(function (require) {
  var d3 = require('d3');
  var _ = require('lodash');

  function renderWith(opts, selection, xScale, height, times) {
    times = (times && times.length) ? times : [new Date().getTime()];
    times = times.map(function (time) {
      if (_.isUndefined(time.time)) {
        time = { time: time };
      }
      return _.assign({}, opts, time);
    });

    selection.each(function () {
      var markers = d3.select(this).selectAll('.' + opts.class)
        .data(times);
      markers
        .enter().append('line')
        .attr('class', function (d) {
          return d.class;
        })
        .attr('pointer-events', 'none');
      markers
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
  }

  function configureWith(baseOpts, opts) {
    newOpts = _.assign({}, baseOpts, opts || {});

    return {
      render: (function _render(newOpts) {
        return function render(selection, xScale, height, times) {
          return renderWith(newOpts, selection, xScale, height, times);
        };
      })(newOpts),
      configure: (function _configure(newOpts) {
        return function configure(opts) {
          return configureWith(newOpts, opts);
        };
      })(newOpts),
      opts: newOpts
    };
  }

  return configureWith({
    'class': 'default-time-marker',
    color: '#aaa',
    opacity: 0.8,
    width: 1
  });
});
