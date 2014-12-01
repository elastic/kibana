define(function (require) {
  return function VisLibFixtures(Private) {
    var $ = require('jquery');

    return function (visLibParams) {
      var Vis = Private(require('components/vislib/vis'));

      $('body').append('<div class=visualize-chart></div>');

      var $el = $('.visualize-chart');
      var config = visLibParams || {
          shareYAxis: true,
          addTooltip: true,
          addLegend: true,
          type: 'histogram'
        };

      return new Vis($el, config);
    };
  };
});
