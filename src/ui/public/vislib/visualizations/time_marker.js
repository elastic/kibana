define(function (require) {
  return function TimeMarkerFactory() {
    var d3 = require('d3');
    var dateMath = require('ui/utils/dateMath');
    var markerRenderer = require('ui/vislib/lib/marker_renderer').configure({
      'class': 'time-marker',
      'color': '#c80000',
      'opacity': 0.3,
      'width': 2
    });

    function TimeMarker(times, xScale, height) {
      if (!(this instanceof TimeMarker)) {
        return new TimeMarker(times, xScale, height);
      }

      this.xScale = xScale;
      this.height = height;
      this.times = (times.length) ? times.map(function (d) {
        return dateMath.parse(d.time);
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

      markerRenderer.render(selection, this.xScale, this.height, this.times);
    };

    return TimeMarker;
  };
});
