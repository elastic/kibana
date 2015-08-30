define(function (require) {
  var d3 = require('d3');
  var _ = require('lodash');

  // XXX: times param should accept array of d3 objects
  function _render(obj, selection, xScale, height, times) {
    times = (times && times.length) ? times : [new Date().getTime()];
    times = times.map(function (time) {
      return _.assign({}, obj, { 'time': time });
    });

    selection.each(function () {
      var markers = d3.select(this).selectAll('.' + obj.class)
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

  function configure(obj) {
    obj = _.assign({
      'class': 'default-time-marker',
      'color': '#aaa',
      'opacity': 0.8,
      'width': 1
    }, obj || {});

    return {
      render: function render(selection, xScale, height, times) {
        return _render(obj, selection, xScale, height, times);
      }
    };
  }

  return {
    render: configure().render,
    configure: configure
  };
});
