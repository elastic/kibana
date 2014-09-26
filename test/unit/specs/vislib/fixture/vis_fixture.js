define(function (require) {
  return function VisLibFixtures(Private) {
    var $ = require('jquery');

    return function (type) {
      var Vis = Private(require('components/vislib/vis'));
      var visChart = $('body').append('<div class=visualize-chart></div>');
      var $el = $('.visualize-chart');
      var config = {
        shareYAxis: true,
        addTooltip: true,
        addLegend: true,
        addEvents: true,
        addBrushing: true,
        type: type
      };

      return new Vis($el, config);
    };
  };
});