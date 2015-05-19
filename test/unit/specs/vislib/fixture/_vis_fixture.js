define(function (require) {
  return function VisLibFixtures(Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    return function (visLibParams) {
      var Vis = Private(require('components/vislib/vis'));

      $('body').append('<div class=visualize-chart></div>');

      var $el = $('.visualize-chart:last');

      $el.width(1024);
      $el.height(300);

      var config = _.defaults(visLibParams || {}, {
        shareYAxis: true,
        addTooltip: true,
        addLegend: true,
        defaultYExtents: false,
        setYExtents: false,
        yAxis: {},
        type: 'histogram'
      });

      return new Vis($el, config);
    };
  };
});
