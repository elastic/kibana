define(function (require) {
  return function TimeMarkerFactory() {
    var d3 = require('d3');
    var dateMath = require('ui/utils/dateMath');
    var markerRenderer = require('ui/vislib/lib/marker_renderer');
    var defaultOpts = {
      'color': '#c80000',
      'opacity': 0.3,
      'width': 2
    };

    function TimeMarker(times, xScale, height, layer) {
      if (!(this instanceof TimeMarker)) {
        return new TimeMarker(times, xScale, height, layer);
      }

      var opts = defaultOpts;
      if (layer) {
        opts = _.assign({}, defaultOpts, { layer: layer });
      }
      this.renderer = markerRenderer.configure(opts);

      this.xScale = xScale;
      this.height = height;
      this.times = (times.length) ? times.map(function (d) {
        return _.omit({
          'time': dateMath.parse(d.time),
          'class': d.class,
          'color': d.color,
          'opacity': d.opacity,
          'width': d.width
        }, _.isUndefined);
      }) : [];
    }

    TimeMarker.prototype._isTimeBasedChart = function (selection) {
      var data = selection.data();
      return data.every(function (datum) {
        return (datum.ordered && datum.ordered.date);
      });
    };

    TimeMarker.prototype.render = function (selection) {
      var self = this;

      // return if not time based chart
      if (!self._isTimeBasedChart(selection)) return;

      this.renderer.render(selection, this.xScale, this.height, this.times);
    };

    return TimeMarker;
  };
});
